import { Helmet } from "react-helmet-async";

interface Props {
  name: string;
  description?: string;
  price: number;
  currency: string;
  image?: string;
  url: string;
  condition?: string;
  sellerName?: string;
  rating?: number;
  reviewCount?: number;
}

const conditionMap: Record<string, string> = {
  new: "https://schema.org/NewCondition",
  like_new: "https://schema.org/UsedCondition",
  used: "https://schema.org/UsedCondition",
  for_parts: "https://schema.org/DamagedCondition",
};

export function SchemaOrgProduct({ name, description, price, currency, image, url, condition, sellerName, rating, reviewCount }: Props) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description?.slice(0, 500),
    url,
    offers: {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: currency.toUpperCase(),
      availability: "https://schema.org/InStock",
      itemCondition: conditionMap[condition || "used"] || conditionMap.used,
    },
  };

  if (image) schema.image = image;
  if (sellerName) schema.offers.seller = { "@type": "Person", name: sellerName };
  if (rating && reviewCount) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.toFixed(1),
      reviewCount,
    };
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
