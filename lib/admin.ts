export const ADMIN_EMAIL = "lyonel@gmail.com";

export const isAdminEmail = (email: string | undefined): boolean =>
  email === ADMIN_EMAIL;
