let delaunay;
let pixelationTimeout;

const handleFiles = (e) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    img.src = event.target.result;
    window.setTimeout(() => onLoad(img), 1);
  }
  reader.readAsDataURL(e.target.files[0]);
}

const handlePixelation = (e) => {
  if (delaunay) {
    window.clearTimeout(pixelationTimeout);
    pixelationTimeout = window.setTimeout(() => {
      delaunay.POINT_RATE = 0.01 * e.target.value;
      delaunay.generate();
    }, 100);
  }
}

const onLoad = (img) => {
  delaunay = new DelaunayTriangulator.Delaunay(img, canvas);
  delaunay.initCtx();
  delaunay.generate();
}

// Declare elements
const img = document.getElementById('before-img');
const canvas = document.getElementById('canvas');
const fileUpload = document.getElementById('file-upload');
const pixelationSlider = document.getElementById('pixelation');

// Event Listeners
window.addEventListener('load', () => {
  onLoad(img);
});

fileUpload.addEventListener('change', handleFiles);

pixelationSlider.addEventListener('change', handlePixelation);