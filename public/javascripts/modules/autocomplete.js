function autocomplete(input, latInput, lngInput){
  if(!input) return; // skip if no address on actual page

  // console.log(input, latInput, lngInput);
  const dropdownList = new google.maps.places.Autocomplete(input);

  dropdownList.addListener('place_changed', () => {
    const place = dropdownList.getPlace();
    latInput.value = place.geometry.location.lat();
    lngInput.value = place.geometry.location.lng();

  })
  //  if someone hits enter on field, don't submit
  input.on('keydown', (e) => {
    if(e.keyCode === 13) e.preventDefault();
  })
}

export default autocomplete;
