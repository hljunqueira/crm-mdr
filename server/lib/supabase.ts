// Temporarily mock supabase to debug 502
export const supabase = {
  from: () => ({
    select: () => ({ order: () => ({ data: [], error: null }) }),
    insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) }),
    delete: () => ({ eq: () => ({ error: null }) })
  })
} as any;

console.warn('⚠️ SUPABASE IS MOCKED FOR DEBUGGING 502');
