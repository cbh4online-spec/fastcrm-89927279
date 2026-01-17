const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface ExtractedData {
  colors: { name: string; hex: string; rgba: string }[];
  typography: { name: string; fontFamily: string; fontSize: number; fontWeight: number; lineHeight?: number }[];
  spacing: number[];
  components: { id: string; name: string; type: string }[];
  images: { id: string; name: string; url?: string }[];
}

function rgbaToHex(color: FigmaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function rgbaToString(color: FigmaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
}

function extractColorsFromNode(node: any, colors: Map<string, { hex: string; rgba: string }>): void {
  // Extract fill colors
  if (node.fills && Array.isArray(node.fills)) {
    node.fills.forEach((fill: any, index: number) => {
      if (fill.type === 'SOLID' && fill.color) {
        const hex = rgbaToHex(fill.color);
        const rgba = rgbaToString({ ...fill.color, a: fill.opacity ?? 1 });
        const name = node.name ? `${node.name}-fill-${index}` : `color-${hex}`;
        colors.set(hex, { hex, rgba });
      }
    });
  }

  // Extract stroke colors
  if (node.strokes && Array.isArray(node.strokes)) {
    node.strokes.forEach((stroke: any, index: number) => {
      if (stroke.type === 'SOLID' && stroke.color) {
        const hex = rgbaToHex(stroke.color);
        const rgba = rgbaToString({ ...stroke.color, a: stroke.opacity ?? 1 });
        colors.set(hex, { hex, rgba });
      }
    });
  }

  // Recurse into children
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => extractColorsFromNode(child, colors));
  }
}

function extractTypographyFromNode(node: any, typography: Map<string, any>): void {
  if (node.type === 'TEXT' && node.style) {
    const style = node.style;
    const key = `${style.fontFamily}-${style.fontSize}-${style.fontWeight}`;
    if (!typography.has(key)) {
      typography.set(key, {
        name: node.name || 'Text Style',
        fontFamily: style.fontFamily || 'Inter',
        fontSize: style.fontSize || 16,
        fontWeight: style.fontWeight || 400,
        lineHeight: style.lineHeightPx || undefined,
        letterSpacing: style.letterSpacing || undefined,
      });
    }
  }

  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => extractTypographyFromNode(child, typography));
  }
}

function extractSpacingFromNode(node: any, spacings: Set<number>): void {
  // Extract padding values
  if (node.paddingLeft) spacings.add(Math.round(node.paddingLeft));
  if (node.paddingRight) spacings.add(Math.round(node.paddingRight));
  if (node.paddingTop) spacings.add(Math.round(node.paddingTop));
  if (node.paddingBottom) spacings.add(Math.round(node.paddingBottom));
  
  // Extract gap values (auto layout)
  if (node.itemSpacing) spacings.add(Math.round(node.itemSpacing));

  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => extractSpacingFromNode(child, spacings));
  }
}

function extractComponentsFromNode(node: any, components: any[]): void {
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE') {
    components.push({
      id: node.id,
      name: node.name,
      type: node.type,
    });
  }

  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => extractComponentsFromNode(child, components));
  }
}

function extractImagesFromNode(node: any, images: any[]): void {
  // Check for image fills
  if (node.fills && Array.isArray(node.fills)) {
    node.fills.forEach((fill: any) => {
      if (fill.type === 'IMAGE' && fill.imageRef) {
        images.push({
          id: fill.imageRef,
          name: node.name || 'Image',
          nodeId: node.id,
        });
      }
    });
  }

  // Check for vector/icon nodes
  if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'STAR' || node.type === 'ELLIPSE' || node.type === 'REGULAR_POLYGON') {
    images.push({
      id: node.id,
      name: node.name || 'Vector',
      type: 'vector',
      nodeId: node.id,
    });
  }

  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => extractImagesFromNode(child, images));
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, nodeId } = await req.json();
    
    const figmaToken = Deno.env.get('FIGMA_ACCESS_TOKEN');
    if (!figmaToken) {
      console.error('FIGMA_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Figma token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetFileId = fileId || 'eUB5FXNRdukArjxFZFO3uT';
    console.log('Fetching Figma file:', targetFileId);

    // Fetch the file data
    const fileUrl = `https://api.figma.com/v1/files/${targetFileId}`;
    const fileResponse = await fetch(fileUrl, {
      headers: {
        'X-Figma-Token': figmaToken,
      },
    });

    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      console.error('Figma API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Figma API error: ${fileResponse.status}` }),
        { status: fileResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileData = await fileResponse.json();
    console.log('File fetched successfully:', fileData.name);

    // Extract design tokens
    const colorsMap = new Map<string, { hex: string; rgba: string }>();
    const typographyMap = new Map<string, any>();
    const spacingsSet = new Set<number>();
    const components: any[] = [];
    const images: any[] = [];

    // Process the document
    extractColorsFromNode(fileData.document, colorsMap);
    extractTypographyFromNode(fileData.document, typographyMap);
    extractSpacingFromNode(fileData.document, spacingsSet);
    extractComponentsFromNode(fileData.document, components);
    extractImagesFromNode(fileData.document, images);

    // Convert to arrays
    const colors = Array.from(colorsMap.entries()).map(([hex, data]) => ({
      name: `color-${hex.replace('#', '')}`,
      hex: data.hex,
      rgba: data.rgba,
    }));

    const typography = Array.from(typographyMap.values());
    const spacing = Array.from(spacingsSet).sort((a, b) => a - b);

    // Fetch image URLs if there are images
    let imagesWithUrls = images;
    const imageRefs = images.filter(img => img.id && !img.type).map(img => img.id);
    
    if (imageRefs.length > 0) {
      try {
        const imagesUrl = `https://api.figma.com/v1/files/${targetFileId}/images`;
        const imagesResponse = await fetch(imagesUrl, {
          headers: { 'X-Figma-Token': figmaToken },
        });
        
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          if (imagesData.meta && imagesData.meta.images) {
            imagesWithUrls = images.map(img => ({
              ...img,
              url: imagesData.meta.images[img.id] || undefined,
            }));
          }
        }
      } catch (e) {
        console.log('Could not fetch image URLs:', e);
      }
    }

    const extractedData: ExtractedData = {
      colors,
      typography,
      spacing,
      components,
      images: imagesWithUrls,
    };

    console.log('Extraction complete:', {
      colors: colors.length,
      typography: typography.length,
      spacing: spacing.length,
      components: components.length,
      images: imagesWithUrls.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        fileName: fileData.name,
        lastModified: fileData.lastModified,
        data: extractedData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error extracting from Figma:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to extract';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
