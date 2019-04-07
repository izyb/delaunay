let delaunay;
let timeoutId;
const canvas = document.getElementById('canvas');
const img = document.getElementById('before-img');
const fileUpload = document.getElementById('file-upload');

const handleFiles = (e) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    img.src = event.target.result;
    window.setTimeout(() => onLoad(img), 1);
  }
  reader.readAsDataURL(e.target.files[0]);
}

const onLoad = (img) => {
  delaunay = new DelaunayTriangulator.Delaunay(img, canvas);
  delaunay.initCtx();
  delaunay.generate();

}

window.addEventListener('load', () => {
  onLoad(img);
});
fileUpload.addEventListener('change', handleFiles);
