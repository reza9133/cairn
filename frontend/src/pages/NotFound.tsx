import Mochi from "../components/Mochi";
import { LinkButton } from "../components/ui";

export default function NotFound() {
  return (
    <div className="page notfound">
      <Mochi size={220} />
      <h1>Lost on the trail</h1>
      <p className="muted">There is no stone here. Mochi checked every cairn and this page is not among them.</p>
      <div className="row"><LinkButton to="/" icon="arrow">Back home</LinkButton><LinkButton to="/pools" variant="ghost" icon="layers">Browse pools</LinkButton></div>
    </div>
  );
}
