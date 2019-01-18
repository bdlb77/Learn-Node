import axios from 'axios';
import dompurify from 'dompurify';
function resultsHTML(stores){
  return stores.map(store => {
    return `
      <a href="/store/${store.slug}" class="search__result">
        <strong>${store.name}</strong>
      </a>
    `;
  }).join('');
}
function typeAhead(searchbox){
  const searchInput= searchbox.querySelector('input[name="search"]');
  const searchResults = searchbox.querySelector('.search__results')

  searchInput.on('input', function(){
    // console.log(this.value)
    // stop results from showing and quit function!
    if(!this.value){
      searchResults.style.display = 'none';
      return;
    }
    searchResults.style.display = 'block';
    searchResults.innerHTML = '';
    axios
      .get(`/api/v1/search?q=${this.value}`)
      .then(res => {
        if(res.data.length){
          console.log('Showin something!');
          searchResults.innerHTML = dompurify.sanitize(resultsHTML(res.data));
          return;
        }
        // tell them nothing came back
        searchResults.innerHTML = dompurify.sanitize(`<div class="search__result"> No results for ${this.value} found! </div>`);
      })
      .catch(err => {
        console.log(err)
      });
  });
  // handle keyboard inputs

  searchInput.on('keyup', e => {
    if(![40, 38, 13].includes(e.keyCode)){
      return; // nah!!
    }
    const activeClass = 'search__result--active';
    const current = searchbox.querySelector(`.${activeClass}`);
    const items = searchbox.querySelectorAll(`.search__result`);
    let next;
    if(e.keyCode === 40 && current) {
      next = current.nextElementSibling || items[0];
    } else if(e.keyCode === 40){
      next = items[0];
    } else if(e.keyCode === 38 && current){
      next =current.previousElementSibling || items[items.length - 1]
    } else if(e.keyCode === 38){
      next = items[items.length -1]
    } else if(e.keyCode === 13 && current.href){
      window.location = current.href;
      return;
    }
    if(current){
      current.classList.remove(activeClass);
    }
      next.classList.add(activeClass);
  })
};

export default typeAhead;
