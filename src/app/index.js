let delaunay;
let renderTimeout;

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
    delaunay.POINT_RATE = 0.01 * e.target.value;
    render();
  }
}

const handleRetry = () => {
  render();
}

const render = () => {
  window.clearTimeout(renderTimeout);
  renderTimeout = window.setTimeout(() => {
    delaunay.generate();
  }, 100);
}

const onLoad = (img) => {
  delaunay = new DelaunayTriangulator.Delaunay(img, canvas);
  delaunay.initCtx();
  render();
}

// Declare elements
const img = document.getElementById('before-img');
const canvas = document.getElementById('canvas');
const fileUpload = document.getElementById('file-upload');
const pixelationSlider = document.getElementById('pixelation');
const retryButton = document.getElementById('retry');

// Event Listeners
window.addEventListener('load', () => {
  onLoad(img);
});

fileUpload.addEventListener('change', handleFiles);
retryButton.addEventListener('click', handleRetry)
pixelationSlider.addEventListener('change', handlePixelation);