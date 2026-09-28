/* Apply the saved theme before first paint (shared by the site, account and staff console). */
try{var t=localStorage.getItem('aw-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
