const ROW_LABELS = ["Pass", "Fail", "Unclr", "N/A"];
const COL_LABELS = ["P", "F", "U", "NA"];

/**
 * Gold (rows) against predicted (columns). The Fail→Pass cell is flagged
 * separately: a real breach called compliant is the failure mode that matters.
 */
export default function ConfusionMatrix({ cm }) {
  return (
    <>
      <table className="cm">
        <thead>
          <tr>
            <th></th>
            {COL_LABELS.map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROW_LABELS.map((label, r) => (
            <tr key={label}>
              <th>{label}</th>
              {cm[r].map((value, c) => (
                <td
                  key={c}
                  data-diag={r === c}
                  data-bad={r === 1 && c === 0}
                  title="Open these items in Langfuse"
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="hint">
        Rows = gold, columns = predicted. Red cell is false-pass: a real breach called compliant.
      </div>
    </>
  );
}
