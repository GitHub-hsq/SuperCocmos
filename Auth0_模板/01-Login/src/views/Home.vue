<script lang="ts">
import Hero from '../components/Hero.vue'
import HomeContent from '../components/HomeContent.vue'

export default {
  name: 'HomeView',
  components: {
    Hero,
    HomeContent,
  },
}
</script>

<template>
  <div>
    <Hero />
    <hr>
    <HomeContent />
  </div>
</template>

<style lang="css" scoped>
.next-steps .fa-link {
  margin-right: 5px;
}
</style>
