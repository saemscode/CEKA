import React from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface SEOProps {
  title?: string;
  description?: string;
  type?: string;
}

export const SEO: React.FC<SEOProps> = ({ title, description, type = "website" }) => {
  const location = useLocation();
  const currentUrl = `https://www.civiceducationkenya.com${location.pathname}`;

  // Use provided title or fallback to generic
  const defaultTitle = "Civic Education Kenya - Educate • Amplify • Empower";
  let finalTitle = title ? title : defaultTitle;
  
  // Clean up "Next Post " prefix if present (data bug workaround)
  if (finalTitle.startsWith("Next Post ")) {
    finalTitle = finalTitle.replace("Next Post ", "");
  }

  // Ensure concise titles
  if (finalTitle.length > 65 && finalTitle !== defaultTitle) {
      finalTitle = `${finalTitle.substring(0, 55).trim()}... | CEKA`;
  } else if (title && !finalTitle.includes("CEKA")) {
      finalTitle = `${finalTitle} | CEKA`;
  }

  const defaultDescription = "Comprehensive civic education platform for Kenyan citizens. Learn about governance, rights, responsibilities, and participate in democracy through interactive tools and resources.";
  
  let finalDescription = description || defaultDescription;
  
  // Enforce description limits
  if (finalDescription.length < 110 && finalDescription !== defaultDescription) {
    finalDescription = `${finalDescription} Discover more on Civic Education Kenya.`;
  }
  if (finalDescription.length > 160) {
    finalDescription = `${finalDescription.substring(0, 157)}...`;
  }

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      
      <link rel="canonical" href={currentUrl} />
      
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content="Civic Education Kenya" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
    </Helmet>
  );
};

