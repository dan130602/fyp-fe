/**
 * The standard action button. `variant` is "primary", "danger", or omitted for
 * the default outline; `ghost` softens whichever variant is in play.
 *
 * View-specific controls that carry their own styling — the officer sidebar nav,
 * the audio play button, the developer view's table controls — stay as plain
 * <button> elements rather than pretending to be this primitive.
 */
export default function Button({ variant, ghost = false, className = "", ...props }) {
  const classes = [variant, ghost ? "ghost" : "", className].filter(Boolean).join(" ");
  return <button className={classes} {...props} />;
}
