<script setup lang="ts">
/**
 * The checkbox list inside "Selected Event Series".
 *
 * Mirrors the original's child component, which receives
 * `{ items, idPrefix, isChecked, onToggle, getSeriesImageUrl, disabled }`.
 *
 * Markup is identical to the original's output. Styling comes from the
 * `.series-*` rules in assets/css/register-page.css - in the original those are
 * `:deep()` selectors from the page's scoped block, which is why they are
 * unscoped here too.
 */

const props = withDefaults(
  defineProps<{
    items: EventSeries[]
    idPrefix?: string
    disabled?: boolean
  }>(),
  { idPrefix: 'series', disabled: false }
)

const selected = defineModel<number[]>({ required: true })

const isChecked = (id: number) => selected.value.includes(id)

const toggle = (id: number) => {
  selected.value = isChecked(id)
    ? selected.value.filter((x) => x !== id)
    : [...selected.value, id]
}
</script>

<template>
  <div class="series-list">
    <div v-for="item in props.items" :key="item.id" class="series-list-item">
      <label class="series-checkbox-label">
        <input
          :id="`${props.idPrefix}-${item.id}`"
          type="checkbox"
          class="series-checkbox-input"
          :checked="isChecked(item.id)"
          :disabled="props.disabled"
          @change="toggle(item.id)"
        />
        <div class="series-list-content">
          <div class="series-list-image">
            <!--
              The original sets alt="<series title>" on this icon, but the same
              title sits in the adjacent .series-list-title span - so a screen
              reader announces every row twice. The icon carries no information
              the text does not, so it is marked decorative instead. No pixels
              change.
            -->
            <img :src="item.image" alt="" class="series-icon" />
          </div>
          <span class="series-list-title">{{ item.title }}</span>
        </div>
      </label>
    </div>
  </div>
</template>
