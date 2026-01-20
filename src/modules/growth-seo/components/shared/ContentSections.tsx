import type { ContentSection } from '../../types';

interface ContentSectionsProps {
  sections: ContentSection[] | undefined;
}

export function ContentSections({ sections }: ContentSectionsProps) {
  if (!sections?.length) return null;

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id} className="prose prose-slate dark:prose-invert max-w-none">
          <h2 className="text-xl font-semibold mb-4">{section.heading}</h2>

          {section.type === 'text' && (
            <div
              className="text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          )}

          {section.type === 'list' && section.items && (
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              {section.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}

          {section.type === 'steps' && section.items && (
            <ol className="list-decimal pl-6 space-y-4">
              {section.items.map((item, index) => (
                <li key={index} className="pl-2 text-muted-foreground">
                  {item}
                </li>
              ))}
            </ol>
          )}

          {section.type === 'comparison' && section.items && (
            <div className="grid md:grid-cols-2 gap-4">
              {section.items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-muted/50"
                >
                  {item}
                </div>
              ))}
            </div>
          )}

          {section.type === 'code' && (
            <pre className="p-4 rounded-lg bg-muted overflow-x-auto">
              <code className="text-sm">{section.content}</code>
            </pre>
          )}
        </section>
      ))}
    </div>
  );
}
