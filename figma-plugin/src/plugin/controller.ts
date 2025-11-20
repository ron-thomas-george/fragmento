// Fragmento Figma plugin controller
// Skeleton implementation – wire to backend API and Supabase later.

figma.showUI(__html__, { width: 360, height: 520 });

figma.ui.onmessage = (msg) => {
  if (msg.type === 'ping') {
    figma.ui.postMessage({ type: 'pong' });
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};
