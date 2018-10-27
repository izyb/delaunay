const canvas = document.getElementById('canvas');
const img = document.getElementById('before-img');
window.addEventListener('load', () => {
  onLoad(img);
});

const onLoad = (img) => {
  const delaunay = new DelaunayTriangulator.Delaunay(img, canvas);
  delaunay.initCtx();
  delaunay.generate();
}