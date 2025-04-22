export function Button({ children, onClick, variant = "default" }) {
  const styles = {
    default: "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700",
    destructive: "px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button className={styles[variant] || styles.default} onClick={onClick}>
      {children}
    </button>
  );
}
