<script setup>
import { ref, onMounted } from 'vue'
const characters = ref([])
const loading = ref(true)
onMounted(async () => {
  try {
    const res = await fetch('/public/characters.json')
    if (res.ok) characters.value = await res.json()
  } catch (e) { console.error(e) } finally { loading.value = false }
})
</script>

# 👤 人物图鉴

<div v-if="loading" style="text-align:center; padding:50px; color:#888;">正在读取档案...</div>

<div v-else class="char-grid">
  <div class="char-card" v-for="(char, index) in characters" :key="index">
    <div class="char-avatar">
      <img v-if="char.image" :src="char.image" alt="avatar" />
      <div v-else class="default-avatar">{{ char.name.charAt(0) }}</div>
    </div>
    <div class="char-info">
      <div class="char-faction">{{ char.faction || '无阵营' }} · {{ char.title || '神秘人' }}</div>
      <h3>{{ char.name }}</h3>
      <p>{{ char.description }}</p>
    </div>
  </div>
  
  <div v-if="characters.length === 0" style="grid-column: 1/-1; text-align:center; color:#888; padding:50px;">
    暂无人物档案，请去后台添加。
  </div>
</div>

<style scoped>
.char-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.char-card {
  background: var(--vp-c-bg-soft, #252526);
  border: 1px solid #333;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  gap: 15px;
  transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
}

.char-card:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand-1, #0e639c);
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
}

.char-avatar img, .default-avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #444;
}

.default-avatar {
  background: #333;
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
}

.char-info {
  flex: 1;
  min-width: 0;
}

.char-faction {
  font-size: 12px;
  color: var(--vp-c-brand-1, #0e639c);
  font-weight: bold;
  margin-bottom: 4px;
}

.char-info h3 {
  margin: 0 0 8px 0;
  color: #fff;
  font-size: 18px;
  border: none;
  padding: 0;
}

.char-info p {
  margin: 0;
  color: #aaa;
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>