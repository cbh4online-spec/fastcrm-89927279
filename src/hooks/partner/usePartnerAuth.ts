// Re-export from the centralized PartnerAuthContext.
// The context provider in src/routes/PartnerRoutes.tsx ensures a single
// auth listener and a single partner_users fetch are shared across the
// entire Partner Center, instead of one per page/component.
export { usePartnerAuth } from "@/contexts/PartnerAuthContext";
