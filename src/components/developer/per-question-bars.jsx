import { questionBarColor, worstQuestionIndex } from "../../lib/metrics.js";

/** End-to-end accuracy per checklist question for one run, weakest bar called out. */
export default function PerQuestionBars({ perQuestion, questions }) {
  const worst = worstQuestionIndex(perQuestion);

  return (
    <>
      <div className="eh">End-to-end by checklist question</div>
      {perQuestion.map((value, index) => {
        const isWorst = index === worst;
        return (
          <div className="qrow" key={questions.ids[index]}
            title={`${questions.names[questions.ids[index]]} — open failing items in Langfuse`}>
            <span className="qid">{questions.ids[index]}</span>
            <span className="qtrack">
              <span className="qfill" style={{
                width: `${value}%`,
                background: questionBarColor(value, isWorst),
              }} />
            </span>
            <span className="qval" style={{ color: isWorst ? "var(--loss)" : "inherit" }}>{value}</span>
          </div>
        );
      })}
      <div className="hint">
        Weakest: {questions.ids[worst]} ({questions.names[questions.ids[worst]]}) at{" "}
        {Math.min(...perQuestion)}%. Click a bar to open that question's items in
        Langfuse, filtered by <code>question_id</code>.
      </div>
    </>
  );
}
