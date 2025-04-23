
export function Button({ children, onClick, variant = "default", ...props }) {
  const styles = {
    default:
      "px-4 py-2 rounded bg-cta text-white font-bold hover:bg-[#22305b] transition",
    destructive:
      "px-4 py-2 rounded bg-error text-white hover:bg-[#a73c4d] transition",
  };
  return (
    <button
      className={styles[variant] || styles.default}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
