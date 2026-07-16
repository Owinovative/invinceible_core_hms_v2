export const THEME_STORAGE_KEY = "hms_theme";

// Static, application-owned code that runs before hydration to prevent a
// light-theme flash when the saved or operating-system preference is dark.
export const themeInitScript = `try{var k="${THEME_STORAGE_KEY}",p=localStorage.getItem(k),d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches),e=document.documentElement;e.classList.toggle("dark",d);e.dataset.theme=d?"dark":"light";e.style.colorScheme=d?"dark":"light"}catch(e){}`;
