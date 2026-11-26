<script lang="ts">
  import { Utensils } from 'lucide-svelte';
  import { loadAppwriteImagePreview } from '$lib/appwrite';

  let {
    src = '',
    alt = '',
    eager = false,
    class: className = ''
  }: {
    src?: string;
    alt?: string;
    eager?: boolean;
    class?: string;
  } = $props();

  let failed = $state(false);
  let previousSrc = '';
  let displaySrc = $state('');
  let objectUrl = '';

  $effect(() => {
    const source = src;
    if (source === previousSrc) return;
    previousSrc = source;
    failed = false;
    displaySrc = source;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = '';
    }

    let cancelled = false;
    let loadedObjectUrl = '';
    void loadAppwriteImagePreview(source).then((loadedSrc) => {
      if (cancelled) {
        if (loadedSrc) URL.revokeObjectURL(loadedSrc);
        return;
      }
      if (loadedSrc) {
        loadedObjectUrl = loadedSrc;
        objectUrl = loadedObjectUrl;
        displaySrc = loadedSrc;
      }
    });

    return () => {
      cancelled = true;
      if (loadedObjectUrl) {
        URL.revokeObjectURL(loadedObjectUrl);
        if (objectUrl === loadedObjectUrl) objectUrl = '';
      }
    };
  });
</script>

<div class={`meal-image ${className}`} class:failed>
  {#if displaySrc && !failed}
    <img
      src={displaySrc}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onerror={() => (failed = true)}
    />
  {:else}
    <div class="meal-image-fallback" role="img" aria-label={alt}>
      <Utensils size={18} strokeWidth={1.8} />
    </div>
  {/if}
</div>

<style>
  .meal-image {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    background: linear-gradient(135deg, #dbe8dc, #a4bfa8);
  }

  .meal-image img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .meal-image-fallback {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: #52705d;
    background: linear-gradient(135deg, #dbe8dc, #b4cbb7);
  }
</style>
