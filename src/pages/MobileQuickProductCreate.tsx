import { Helmet } from "react-helmet-async";
import { MQPCWizard } from "@/components/mqpc/MQPCWizard";

export default function MobileQuickProductCreate() {
  return (
    <>
      <Helmet>
        <title>Criar Produto Rápido | FastCRM</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Helmet>
      <MQPCWizard />
    </>
  );
}
