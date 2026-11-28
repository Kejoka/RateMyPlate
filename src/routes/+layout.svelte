<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    if (!('serviceWorker' in navigator)) return;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => undefined);
    }
  });
</script>

<slot />

<style>
  :global(*) {
    scrollbar-width: thin;
    scrollbar-color: rgba(97, 116, 101, .42) transparent;
  }

  :global(*::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }

  :global(*::-webkit-scrollbar-track),
  :global(*::-webkit-scrollbar-corner) {
    background: transparent;
  }

  :global(*::-webkit-scrollbar-thumb) {
    border: 2px solid transparent;
    border-radius: 999px;
    background: rgba(97, 116, 101, .42);
    background-clip: padding-box;
  }

  :global(*::-webkit-scrollbar-thumb:hover) {
    background: rgba(50, 112, 69, .72);
    background-clip: padding-box;
  }

  @media (prefers-color-scheme: dark) {
    :global(*) {
      scrollbar-color: rgba(155, 178, 160, .36) transparent;
    }

    :global(*::-webkit-scrollbar-thumb) {
      background: rgba(155, 178, 160, .36);
      background-clip: padding-box;
    }

    :global(*::-webkit-scrollbar-thumb:hover) {
      background: rgba(117, 189, 131, .76);
      background-clip: padding-box;
    }
  }
</style>
