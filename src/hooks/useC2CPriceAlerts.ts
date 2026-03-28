import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/**
 * Notify users who favorited a listing when its price drops.
 * Called from useUpdateC2CListing after a successful update.
 */
export async function notifyPriceDrop(
  listingId: string,
  workspaceId: string,
  oldPrice: number,
  newPrice: number,
  listingTitle: string
) {
  if (newPrice >= oldPrice) return;

  const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

  // Find users who favorited this listing
  const { data: favorites } = await sb
    .from("c2c_favorites")
    .select("user_id")
    .eq("listing_id", listingId);

  if (!favorites?.length) return;

  const notifications = favorites.map((f: any) => ({
    workspace_id: workspaceId,
    user_id: f.user_id,
    type: "price_drop",
    title: `💰 Descida de preço: ${listingTitle}`,
    body: `O preço baixou ${discount}%! De €${oldPrice.toFixed(0)} para €${newPrice.toFixed(0)}.`,
    listing_id: listingId,
    is_read: false,
  }));

  await sb.from("c2c_notifications").insert(notifications);
}

/**
 * Notify users who have favorites in the same category when a new listing is created.
 */
export async function notifyNewInCategory(
  listingId: string,
  workspaceId: string,
  categoryId: string | null,
  listingTitle: string,
  sellerId: string
) {
  if (!categoryId) return;

  // Find listings in this category that are favorited
  const { data: catListings } = await sb
    .from("c2c_listings")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("category_id", categoryId)
    .neq("id", listingId);

  if (!catListings?.length) return;

  const listingIds = catListings.map((l: any) => l.id);

  // Find users who favorited listings in this category (unique)
  const { data: favorites } = await sb
    .from("c2c_favorites")
    .select("user_id")
    .in("listing_id", listingIds.slice(0, 50));

  if (!favorites?.length) return;

  const uniqueUsers = [...new Set(favorites.map((f: any) => f.user_id as string))]
    .filter(uid => uid !== sellerId);

  if (!uniqueUsers.length) return;

  const notifications = uniqueUsers.slice(0, 20).map(uid => ({
    workspace_id: workspaceId,
    user_id: uid,
    type: "new_in_category",
    title: `🆕 Novo anúncio: ${listingTitle}`,
    body: `Há um novo produto numa categoria que segues.`,
    listing_id: listingId,
    is_read: false,
  }));

  await sb.from("c2c_notifications").insert(notifications);
}
