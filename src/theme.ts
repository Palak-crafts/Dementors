export function initTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('disastra_theme') as 'light' | 'dark' | null;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const theme = saved || (prefersDark ? 'dark' : 'light');

  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  return theme;
}

export function setTheme(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    localStorage.setItem('disastra_theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('disastra_theme', 'light');
  }
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
}

export function toggleTheme(): 'light' | 'dark' {
  const isDark = document.documentElement.classList.contains('dark');
  const nextTheme = isDark ? 'light' : 'dark';
  setTheme(nextTheme);
  return nextTheme;
}