// year for footer
document.getElementById('year').textContent = new Date().getFullYear();

// smooth scroll for sections 
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const target = document.querySelector(a.getAttribute('href'));
    if(target){
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth',block:'start'});
    }
  })
})

(function(){
  function handleFirstTab(e) {
    if(e.key === 'Tab'){
      document.body.classList.add('show-focus-outlines');
      window.removeEventListener('keydown', handleFirstTab);
    }
  }
  window.addEventListener('keydown', handleFirstTab);
})();
