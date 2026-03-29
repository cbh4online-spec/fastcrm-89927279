import { Navigate } from "react-router-dom";

export default function MetaInboxRedirect() {
  return <Navigate to="/dashboard/inbox?channel=messenger" replace />;
}
