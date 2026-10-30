// Only when opened by the desktop launcher (?desktop=<id>): tell it the window is alive, and when it closes.
const id = new URLSearchParams(location.search).get('desktop');
if (id) {
  const beat = () => fetch(`/beat?id=${id}`, { cache: 'no-store' }).catch(() => {});
  beat(); setInterval(beat, 2000);
  addEventListener('pagehide', () => navigator.sendBeacon(`/bye?id=${id}`));
}
