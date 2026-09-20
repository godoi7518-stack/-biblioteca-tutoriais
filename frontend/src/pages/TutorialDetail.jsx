import MarkdownLite from "../components/MarkdownLite";
import AccordionSteps from "../components/AccordionSteps";
import { parseNumberedSteps } from "../utils/helpers";

export default function TutorialDetailPage({ tutorial }) {
  const isStructured = tutorial.content_type === "structured";

  const structuredSteps = isStructured
    ? (tutorial.steps || []).map((s) => ({
        title: s.title,
        text: s.content,
        critical: s.is_critical,
      }))
    : null;

  const parsedSimpleSteps = !isStructured ? parseNumberedSteps(tutorial.content) : null;

  return (
    <div className="content">
      <div className="tut-detail">
        <h1>{tutorial.title}</h1>
        <div className="meta-line">
          {isStructured ? "Tutorial estruturado" : "Tutorial em texto corrido"}
        </div>

        {isStructured ? (
          <AccordionSteps steps={structuredSteps} />
        ) : parsedSimpleSteps ? (
          <AccordionSteps steps={parsedSimpleSteps} />
        ) : (
          <MarkdownLite text={tutorial.content || ""} />
        )}
      </div>
    </div>
  );
}