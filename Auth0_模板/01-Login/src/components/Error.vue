<script lang="ts">
export default {
  name: 'ErrorMessage',
  computed: {
    msg() {
      return this.$auth0.error.value
    },
  },
}
</script>

<template>
  <div v-if="msg" class="alert alert-danger alert-dismissible">
    {{ msg }}
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
</template>
