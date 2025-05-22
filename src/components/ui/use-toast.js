
// Simple toast hook for use across the application
// This is a placeholder until we implement a proper toast system

export function useToast() {
  return {
    toast: ({ title, description, variant }) => {
      console.log(`Toast: ${title} - ${description} (${variant || 'default'})`);
      // For now this just logs to the console
    }
  };
}
