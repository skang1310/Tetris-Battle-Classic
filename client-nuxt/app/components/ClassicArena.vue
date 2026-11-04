<template>
  <main class="classic-shell refresh-shell liquid-ui hub-shell" :class="{'phone-landscape': phoneLandscape && screen==='battle','battle-screen':screen==='battle'}" :inert="controllerSettingsOpen || setupOpen">
    <ArcadePages v-if="screen!=='battle'" :screen="screen" :desktop-keyboard="desktopKeyboard" :input-style="inputStyle" @prepare="prepareMode" :modes="MODES" :room-code="roomCode" :room-peers="roomPeers" :seat="seat" :share-u-r-l="shareURL" :qr="qr" :network-error="networkError" :map-names="mapNames" :selected-map="selectedMap" :history="history" @settings="openControllerSettings" @profiles="openProfiles" @recent="playRecent" v-model:match-rules="matchRules" v-model:cpu="cpu" v-model:sound="sound" v-model:player-name="playerName" v-model:join-code="joinCode" v-model:selected-mode="selectedMode" v-model:host-spectator="hostSpectator" @menu="menu" @modes="navigatePage('modes')" @lobby="openLobby" @maps="navigatePage('maps')" @help="navigatePage('help')" @quit="quit" @legacy="emit('legacy')" @original="originalSetup" @select="selectMode" @choose-map="chooseMap" @connect="connectRoom" @start-network="startNetwork" />
    <div v-show="screen==='battle'" class="classic-stage" :class="{'feedback-pulse':feedbackPulse}" :style="{ width: `${(mobile && screen==='battle' ? 400 : 800) * scale}px`, height: `${600 * scale}px` }">
      <div class="stage-content" :style="{ transform: `scale(${scale})` }">
        <BattleSideSlots v-if="screen==='battle'&&(arena.mode==='item'||arena.mode==='speed')" v-for="(player,position) in [viewSeat,1-viewSeat]" :key="player" :position="position" :label="shortPlayer(player)" :mode="arena.mode" :item-style="arena.itemStyle" :boost-state="arena.boosts[player]!" :item="arena.items[player]!" :disabled="countdownRemaining>0||arena.paused||arena.finished||(!arena.localTwoPlayer&&player!==viewSeat)||(networkStarted&&hostSpectator&&seat===0)" :keys="slotKeys(player)" :stage="arena.speedStage" :multiplier="800/arena.players[player]!.getDropInterval()" :next-speed="Math.max(0,15000-arena.elapsed%15000)" @use="useItemSlot(player,$event)"/><canvas ref="canvas" tabindex="0" width="800" height="600" aria-label="Classic Tetris Battle: two boards, Hold, Next and attack counters" />
        <button v-if="screen === 'battle'" class="hotspot guest" aria-label="Pause and controls" @click="togglePause" />
        <button v-if="screen === 'battle'" class="hotspot question" aria-label="Pause and controls" @click="togglePause" />
        <div v-if="countdownRemaining>0&&!arena.paused" class="round-countdown" :style="{width:mobile?'400px':'800px'}" role="status" aria-live="assertive" aria-atomic="true"><div><span>GET READY!</span><strong :key="countdownNumber">{{ countdownNumber }}</strong><small>준비하세요 · 곧 시작합니다</small></div></div>
        <div v-if="screen === 'battle' && (arena.paused || (arena.winner !== null && resultDetailsOpen))" class="pause-layer">
          <div class="pause-card" :class="{'winner-two':arena.winner===1,'draw-result':arena.winner===-1}"><span class="pause-eyebrow">{{ arena.finished?'NICE GAME, WELL PLAYED.':'TAKE A LITTLE BREATHER.' }}</span>
            <h1 aria-live="polite">{{ arena.finished ? resultTitle : '잠깐, 쉬어갈까요?' }}</h1>
            <p v-if="arena.winner === null">← → Move · ↑ Rotate · ↓ Soft drop<br>Space Drop · C Hold · Z Reverse<br>P / Esc Pause · F Full screen</p>
            <p v-if="arena.localTwoPlayer && !networkStarted && !arena.finished">{{ inputStyle==='dual'?'PLAYER 2: ← → Move · ↑ Rotate · ↓ Soft drop':'PLAYER 2: A D Move · W Rotate · S Drop' }}<br>{{ inputStyle==='dual'?'Space Hard drop · C Hold':'Q Hard drop · E Hold' }}</p>
            <button v-if="!arena.finished" @click="openControllerSettings">조작 설정</button>
            <button v-if="arena.winner === null" aria-label="RESUME" @click="togglePause">계속하기 →</button>
            <div v-if="arena.finished&&series.bestOf>1" class="series-result" role="status"><strong>{{ series.winner===null?'시리즈 진행 중':'시리즈 종료' }}</strong><b>{{ playerLabel(0) }} {{ series.wins[0] }}승 · {{ playerLabel(1) }} {{ series.wins[1] }}승</b><small>{{ series.bestOf }}판 {{ winsNeeded(series.bestOf) }}선승 · {{ series.rounds }}판 진행 · 무승부 {{ series.draws }}회</small></div><div v-if="arena.finished" class="result-comparison"><p class="result-reason">{{ arena.outcome }}</p><table aria-label="대전 결과"><thead><tr><th>플레이어</th><th>KO</th><th>지운 줄</th><th>보낸 줄</th><th>당한 KO</th><th>최대 콤보</th><th>점수</th></tr></thead><tbody><tr v-for="(player,index) in arena.players" :key="index" :class="{'result-winner':arena.cooperative?arena.winner===0:arena.winner===index}"><th>{{ playerLabel(index) }} <span v-if="arena.cooperative?arena.winner===0:arena.winner===index">WIN</span></th><td>{{ arena.kos[index] }}</td><td>{{ player.linesCleared }}</td><td>{{ player.sent }}</td><td>{{ arena.kos[1-index]??0 }}</td><td>{{ maxCombos[index]??0 }}</td><td>{{ player.score.toLocaleString() }}</td></tr></tbody></table><small v-if="!arena.cooperative">판정 순서: {{ activeRules.koTarget }} KO 즉시 승리 · 시간 종료 시 KO → 보낸 줄 → {{ arena.original?'낮은 블록 높이':'점수' }}</small></div>
            <template v-if="arena.finished"><button :disabled="!highlightClips.length" @click="replayOpen=!replayOpen">{{ replayOpen?'명장면 접기':'✦ 명장면 다시 보기' }}</button><MatchReplay v-if="replayOpen" :clips="highlightClips" :names="[playerLabel(0),playerLabel(1)]"/><p class="rematch-shortcut">{{ networkStarted?'Enter · 재대전 준비':arena.localTwoPlayer?(inputStyle==='dual'?'각자 Enter · 두 사람 모두 준비하면 시작':'1P Enter · 2P Shift+Enter · 둘 다 준비하면 시작'):'Enter · 다시 플레이' }}</p></template><p v-if="arena.finished && personalBest" class="personal-best">★ NEW PERSONAL BEST!</p>
            <template v-if="arena.finished && networkStarted">
              <p class="rematch-status" role="status">{{ rematchReady.length }} / {{ rematchRequired.length }}명 재대전 준비{{ rematchRequired.length<2?' · 상대 연결을 기다리는 중':'' }}</p>
              <button v-if="!(hostSpectator && seat===0)" :disabled="rematchRequired.length<2" :aria-pressed="rematchReady.includes(seat)" @click="requestRematch">{{ rematchReady.includes(seat)?'재대전 준비 취소':seriesOngoing?'다음 판 준비':series.bestOf>1?'새 시리즈 준비':'재대전 준비' }}</button>
              <p v-else>참가자 모두 준비하면 같은 방에서 시작합니다.</p>
            </template>
            <template v-else-if="arena.finished && arena.localTwoPlayer">
              <p role="status">{{ seriesOngoing?'두 플레이어가 준비하면 다음 판을 시작합니다.':'두 플레이어가 확인하면 새 대전을 시작합니다.' }}</p>
              <div class="local-rematch"><button v-for="i in [0,1]" :key="i" :aria-pressed="localReady.includes(i)" @click="confirmLocalRematch(i)">PLAYER {{ i+1 }} {{ localReady.includes(i)?'준비됨 ✓':seriesOngoing?'다음 판':series.bestOf>1?'새 시리즈':'재대전' }}</button></div>
            </template>
            <button v-else-if="!networkStarted" @click="restartOrContinue">{{ arena.finished?(seriesOngoing?'다음 판 시작':series.bestOf>1?'새 시리즈 시작':'다시 플레이'):'새 대전 시작' }}</button>
            <button v-if="arena.finished" @click="resultDetailsOpen=false">게임판 보기</button><button @click="menu">MENU</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="screen==='battle'" class="match-status" aria-label="현재 대전 상황"><div><span>{{ shortPlayer(viewSeat) }}</span><b class="ko-tally"><span>획득 {{ arena.kos[viewSeat] }} KO</span><span class="ko-received" :aria-label="`${shortPlayer(viewSeat)} 당한 KO`">당한 {{ arena.kos[1-viewSeat] }} KO</span></b><section class="line-totals"><span :aria-label="`${shortPlayer(viewSeat)} 지운 줄`">지운 <b>{{ arena.players[viewSeat]!.linesCleared }}</b>줄</span><span :aria-label="`${shortPlayer(viewSeat)} 보낸 줄`">보낸 {{ arena.players[viewSeat]!.sent }}줄</span></section></div><section><strong>{{ arena.finished?resultTitle:arena.cooperative?`함께 ${arena.teamLines} / ${arena.goalLines}줄`:arena.leader===null?'현재 동점':`${shortPlayer(arena.leader)} 우세` }}</strong><small>{{ rulesSummary }}</small><b v-if="series.bestOf>1" class="series-score">{{ shortPlayer(0) }} {{ series.wins[0] }}승 · {{ shortPlayer(1) }} {{ series.wins[1] }}승</b></section><div><span>{{ shortPlayer(1-viewSeat) }}</span><b class="ko-tally"><span>획득 {{ arena.kos[1-viewSeat] }} KO</span><span class="ko-received" :aria-label="`${shortPlayer(1-viewSeat)} 당한 KO`">당한 {{ arena.kos[viewSeat] }} KO</span></b><section class="line-totals"><span :aria-label="`${shortPlayer(1-viewSeat)} 지운 줄`">지운 <b>{{ arena.players[1-viewSeat]!.linesCleared }}</b>줄</span><span :aria-label="`${shortPlayer(1-viewSeat)} 보낸 줄`">보낸 {{ arena.players[1-viewSeat]!.sent }}줄</span></section></div></div>
    <p v-if="screen==='battle'&&arena.mode==='speed'" class="mode-controls">⚡ SPEED {{ arena.speedStage }}/8 · 15초마다 가속 · {{ arena.original?'원작 배틀 규칙 · 5 KO':rulesSummary }}</p>
    <div v-if="screen==='battle'&&arena.mode==='item'" class="mode-controls" role="status"><button class="item-guide-open" @click="openItemGuide">아이템 안내 · ?</button><template v-if="arena.itemStyle==='boosts'">⬡ 방패 · ⇧ Final Rush · ☢ Twin Bomb — 자동 적용 / 줄 삭제·콤보로 공격 <span v-for="player in itemSeats" :key="player">{{ arena.items[player]!.noticeTime>0?arena.items[player]!.notice:'' }}</span></template><template v-else>아이템 수집 · 1P V/B/N 또는 1/2/3 · 2P {{ inputStyle==='dual'?'V/B/N 또는 1/2/3':'R/T/Y 또는 7/8/9' }}<span v-for="player in itemSeats" :key="player"> {{ shortPlayer(player) }}: {{ arena.items[player]!.noticeTime>0?arena.items[player]!.notice:'보드 왼쪽 슬롯으로 사용' }}</span></template></div>
    <ItemTray v-if="screen==='battle'&&arena.mode==='item'&&arena.itemStyle==='collect'&&mobile" :state="arena.items[viewSeat]!" label="내 아이템" :keys="['1','2','3']" :disabled="countdownRemaining>0||arena.paused||arena.finished" :cooldown="arena.items[viewSeat]!.cooldown" :next="arena.nextItemIn" :slow="arena.players[viewSeat]!.slowTime" @use="useItemSlot(viewSeat,$event)"/>
    <nav v-if="screen==='battle'" class="classic-options" aria-label="Game options">
      <span>{{ arena.info.name }}{{ networkStarted ? ` · ROOM ${roomCode}` : '' }}</span>
      <label><input v-model="sound" type="checkbox" @change="syncAudio"> 음악</label>
      <button v-if="arena.finished" @click="resultDetailsOpen=true">결과</button><button @click="menu">홈</button><button @click="togglePause">일시정지</button>
    </nav>
    <GameController v-if="screen === 'battle' && controllerVisible" :size="controller.size" :left-handed="controller.leftHanded" :disabled="countdownRemaining>0 || arena.paused || arena.finished || (networkStarted && hostSpectator && seat===0)" :retro="['retro','nblox'].includes(arena.mode)" :multiplayer="arena.players.length>2" @press="touchDown" @release="touchUp" @pause="togglePause" @settings="openControllerSettings" @target="cycleTarget" />
    <button v-if="screen==='battle' && !controllerVisible" class="controller-show" @click="openControllerSettings">조작 설정</button>
    <Teleport to="body"><div v-if="setupOpen" class="match-setup-backdrop" @click.self="cancelSetup"><section ref="setupDialog" class="match-setup" role="dialog" aria-modal="true" aria-labelledby="match-setup-title" @keydown="setupKeydown"><header><div><small>READY TO BATTLE</small><h2 id="match-setup-title">어떻게 플레이할까요?</h2></div><button aria-label="시작 준비 닫기" @click="cancelSetup">✕</button></header><p class="setup-intro">혼자 가볍게, 둘이 신나게. 오늘의 상대를 골라주세요.</p><div class="setup-mode-badge">{{ selectedModeName }} <span>READY WHEN YOU ARE</span></div><div class="setup-body"><section v-if="selectedMode==='item'" class="setup-item-controls"><label>아이템 사용 방식<select aria-label="시작 전 아이템 사용 방식" :value="matchRules.itemStyle||'collect'" @change="setSetupItemStyle(($event.target as HTMLSelectElement).value)"><option value="collect">숫자 1·2·3으로 사용 · 블록 수집</option><option value="boosts">자동 부스트 · 숫자키 사용 안 함</option></select></label><small>{{ matchRules.itemStyle==='boosts'?'자동 부스트는 가방 아이템이 없어요. 숫자키로 쓰려면 블록 수집을 선택하세요.':'시작 아이템: 로켓·방패. 숫자는 가방 순서이며, 빈 칸은 아이템 블록을 지워 채워요.' }}</small></section><details class="setup-players" :open="playChoice==='dual'"><summary><span>대전 방식<strong>{{ playOptions.find(option=>option.id===playChoice)?.name }}</strong></span><b>변경 ⌄</b></summary><fieldset class="play-choices"><legend><b>01</b> 누구와 플레이할까요?</legend><label v-for="option in playOptions" :key="option.id" :class="{'chosen':playChoice===option.id,'unavailable':option.id==='dual'&&!desktopKeyboard}"><input type="radio" name="play-style" :value="option.id" v-model="playChoice" :disabled="option.id==='dual'&&!desktopKeyboard"><span class="choice-icon" aria-hidden="true">{{ option.id==='cpu'?'◉':option.id==='shared'?'⌨':option.id==='dual'?'▥':'↗' }}</span><span><strong>{{ option.name }}</strong><small>{{ option.description }}</small></span><span class="choice-check" aria-hidden="true">{{ playChoice===option.id?'✓':'' }}</span></label></fieldset></details><KeyboardRegistration v-if="playChoice==='dual'" class="setup-keyboards" :status="keyboards" @command="keyboardCommand"/><p v-else class="setup-tip">{{ playChoice==='online'?'대전방에서 친구와 연결한 뒤 함께 카운트다운합니다.':playChoice==='shared'?'1P: 방향키 · Space · C / 2P: A D W S · Q · E':'방향키로 이동 · ↑ 회전 · Space 빠른 낙하 · C 홀드' }}</p><section class="setup-customize"><h3><b>02</b> 오늘의 경기</h3><MapPicker v-if="playChoice==='cpu'" :selected="selectedMap" @select="chooseMap"/><div v-else class="setup-random-map"><span>↻</span><div><strong>매 판, 새로운 랜덤 맵</strong><small>직전 맵은 제외하고, 두 사람에게 같은 맵을 적용해요.</small></div><b>AUTO</b></div><details class="setup-details"><summary>경기 규칙 바꾸기 <span>시간 · KO · 선승제 · 부스트 ⌄</span></summary><MatchOptions v-model="matchRules" :mode="selectedMode"/></details></section></div><footer><button class="setup-cancel" @click="cancelSetup">돌아가기</button><button class="setup-start" :disabled="playChoice==='dual'&&!dualReady" @click="confirmSetup">{{ playChoice==='online'?'대전방으로 이동':'준비 완료 · 시작' }}</button></footer><small class="countdown-note">{{ playChoice==='cpu'?'선택한 맵으로 시작해요.':'2인 대전은 매 판 직전과 다른 랜덤 맵으로 시작해요.' }} 3 → 2 → 1 카운트다운 후 시작해요.</small></section></div></Teleport>
    <Teleport to="body"><div v-if="controllerSettingsOpen" class="controller-settings-backdrop" @keydown.esc.stop="controllerSettingsOpen=false" @click.self="controllerSettingsOpen=false"><section ref="controllerDialog" @keydown="settingsKeydown" role="dialog" aria-modal="true" aria-labelledby="controller-settings-title" class="controller-settings v2-settings">
      <header><h2 id="controller-settings-title">조작 설정</h2><button autofocus @click="controllerSettingsOpen=false" aria-label="조작 설정 닫기">✕</button></header>
      <p>{{ settingsTab==='items'?'모드별 아이템 효과와 사용 키를 확인하세요.':'한 번 누르면 즉시 한 칸 이동합니다. 길게 누를 때의 속도를 조절해 주세요.' }}</p>
      <div class="settings-tabs" role="tablist" aria-label="조작 설정 종류" @keydown="settingsTabKeydown"><button v-for="tab in settingsTabs" :id="`settings-${tab.id}-tab`" :key="tab.id" role="tab" :aria-selected="settingsTab===tab.id" :aria-controls="`settings-${tab.id}-panel`" :tabindex="settingsTab===tab.id?0:-1" @click="settingsTab=tab.id">{{ tab.name }}</button></div>
      <div v-show="settingsTab==='profiles'" id="settings-profiles-panel" role="tabpanel" aria-labelledby="settings-profiles-tab"><PlayerProfiles v-model="profiles"/></div><div v-show="settingsTab==='items'" id="settings-items-panel" role="tabpanel" aria-labelledby="settings-items-tab"><ItemGuide/></div><div v-show="settingsTab==='keyboard'" id="settings-keyboard-panel" role="tabpanel" aria-labelledby="settings-keyboard-tab"><KeyboardRegistration v-if="desktopKeyboard" class="dual-keyboards" :status="keyboards" @command="keyboardCommand"/><h3>키보드 이동 속도</h3>
      <div class="speed-presets"><button v-for="preset in keyboardPresets" :key="preset.name" :aria-pressed="controller.keyboardDelay===preset.delay && controller.keyboardRepeat===preset.repeat" @click="controller.keyboardDelay=preset.delay;controller.keyboardRepeat=preset.repeat">{{ preset.name }}</button></div>
      <label>키보드 연속 이동 시작<input aria-label="키보드 연속 이동 시작" type="range" min="100" max="400" step="10" v-model.number="controller.keyboardDelay"><span>{{ controller.keyboardDelay }}ms · 클수록 길게 기다려요</span></label>
      <label>키보드 연속 이동 간격<input aria-label="키보드 연속 이동 간격" type="range" min="30" max="200" step="5" v-model.number="controller.keyboardRepeat"><span>{{ controller.keyboardRepeat }}ms · 클수록 천천히 이동해요</span></label>
      </div><div v-show="settingsTab==='feedback'" id="settings-feedback-panel" role="tabpanel" aria-labelledby="settings-feedback-tab"><SoundSettings v-model="soundSettings" :music="sound" @music="sound=$event" @test="testSound"/><h3>햅틱과 피드백</h3><label class="setting-check"><input type="checkbox" v-model="controller.haptics">햅틱과 시각 피드백 켜기</label><small>{{ hapticAvailable ? '회전 · 홀드 · 빠른 낙하 · 줄 삭제 · KO · 승패에 햅틱을 사용해요.' : '이 브라우저는 진동을 지원하지 않아요. 짧은 빛으로 반응을 알려드려요.' }}</small><button class="feedback-test" :disabled="!controller.haptics" @click="feedback('rotate')">피드백 테스트</button></div><div v-show="settingsTab==='touch'" id="settings-touch-panel" role="tabpanel" aria-labelledby="settings-touch-tab"><h3>터치 패드</h3>
      <label>연속 이동 시작 <input aria-label="연속 이동 시작" type="range" min="60" max="200" step="10" v-model.number="controller.moveDelay"><span>{{ controller.moveDelay }}ms</span></label>
      <label>연속 이동 간격 <input aria-label="연속 이동 간격" type="range" min="20" max="100" step="5" v-model.number="controller.moveRepeat"><span>{{ controller.moveRepeat }}ms</span></label>
      <label>버튼 크기<select aria-label="버튼 크기" v-model="controller.size"><option value="small">작게</option><option value="normal">보통</option><option value="large">크게</option></select></label>
      <label class="setting-check"><input type="checkbox" v-model="controller.leftHanded">왼손잡이 배치 · 방향과 회전 패드 바꾸기</label>
      <label class="setting-check"><input type="checkbox" v-model="controller.hideDesktop">맥에서는 터치 패드 숨기기</label>
      <small>설정은 이 기기에 자동 저장됩니다. 왼손은 이동 · 오른손은 회전과 빠른 낙하<br>두 손가락 동시 조작 · 좌우 버튼 사이 슬라이드 지원</small>
      </div><div class="settings-save-note">내 손에 맞춘 설정은 이 기기에 자동 저장돼요.</div><button class="settings-done" @click="controllerSettingsOpen=false">완료</button>
    </section></div></Teleport>
    <span class="sr-only" role="status">{{ status }}</span>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, computed, watch, shallowRef, triggerRef, onMounted, onUnmounted } from 'vue'
import ItemTray from './ItemTray.vue'
import { type BattleGame } from '~/game/ClassicBattle'
import {blockItem,ITEMS, MODES, ModeSession, ModeGame, type ModeId } from '~/game/GameModes'
import {GameAudio,defaultAudioSettings,readAudioSettings,type SoundEvent} from '~/game/GameAudio'
import { Game } from '~/game/Game'
import { NetworkClient, type RoomPeer } from '~/game/NetworkClient'
import QRCode from 'qrcode'
import { HISTORY_KEY, emptyHistory, readHistory, rememberMode, recordMatch, type RecentMode } from '~/game/PlayerHistory'
import { Tetromino, type TetrominoType } from '~/game/Tetromino'
import { playHaptic, hapticSupported, type HapticEvent } from '~/game/Haptics'
import { emptyKeyboardStatus, nativeKey, nativeGameKeys, type KeyboardStatus } from '~/game/DualKeyboard'
import { MAP_OPTIONS, validMap } from '~/game/ClassicMaps'
import { consumeCountdown } from '~/game/RoundCountdown'
import MatchOptions from './MatchOptions.vue'
import MapPicker from './MapPicker.vue'
import {defaultMatchRules,normalizeMatchRules,newSeries,readSeries,recordSeriesRound,winsNeeded,matchRulesLabel} from '~/game/MatchRules'
import PlayerProfiles from './PlayerProfiles.vue'
import MatchReplay from './MatchReplay.vue'
import {PROFILE_KEY,readProfiles,profileKey,customProfile,keyOptions} from '~/game/PlayerProfiles'
import {MatchHighlights} from '~/game/MatchHighlights'
import KeyboardRegistration from './KeyboardRegistration.vue'
import { classicKey } from '~/game/ClassicKeys'
const emit = defineEmits<{ legacy: [] }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const screen = ref<'menu' | 'modes' | 'lobby' | 'maps' | 'help' | 'battle'>('menu')
const preferredItemStyle=ref<'collect'|'boosts'>('collect')
let itemPreferencesReady=false
const matchRules=ref(defaultMatchRules()),activeRules=ref(defaultMatchRules()),series=ref(newSeries(1))
const rulesSummary=computed(()=>matchRulesLabel(activeRules.value))
const seriesOngoing=computed(()=>series.value.bestOf>1&&series.value.winner===null)
watch(matchRules,rules=>{if(itemPreferencesReady&&selectedMode.value==='item'&&rules.itemStyle){preferredItemStyle.value=rules.itemStyle;try{localStorage.setItem('tetris-item-style-v2',rules.itemStyle)}catch{}};try{localStorage.setItem('tetris-match-rules',JSON.stringify(rules))}catch{};broadcastLobby()},{deep:true})
const scale = ref(1), cpu = ref(true), sound = ref(true), status = ref('Ready')
type PlayStyle='cpu'|'shared'|'dual'|'online'
const setupOpen=ref(false),playChoice=ref<PlayStyle>('cpu'),inputStyle=ref<PlayStyle>('cpu'),setupDialog=ref<HTMLElement|null>(null)
const countdownRemaining=ref(0),countdownNumber=computed(()=>Math.ceil(countdownRemaining.value/1000))
const selectedModeName=computed(()=>MODES.find(m=>m.id===selectedMode.value)?.name||'기본전')
const playOptions=[{id:'cpu',name:'컴퓨터와 대전',description:'혼자서 CPU와 한 판'},{id:'shared',name:'2P · 키보드 하나',description:'한 맥에서 서로 다른 키로 플레이'},{id:'dual',name:'2P · 키보드 두 개',description:'맥 앱 전용 · 각자 같은 방향키 사용'},{id:'online',name:'온라인 · 각자 기기로',description:'맥·아이폰에서 같은 방으로 참가'}] as const
let setupReturnFocus:HTMLElement|null=null
watch(setupOpen,async open=>{held.clear();if(open){setupReturnFocus=document.activeElement as HTMLElement;await nextTick();(()=>{const selected=setupDialog.value?.querySelector<HTMLInputElement>('input:checked');(selected?.getClientRects().length?selected:setupDialog.value?.querySelector<HTMLButtonElement>('.setup-start'))?.focus()})()}else{if(keyboards.value.learning!==null)keyboardCommand('cancel');await nextTick();if(setupReturnFocus?.isConnected)setupReturnFocus.focus()}})
function setupKeydown(e:KeyboardEvent){if(e.key==='Enter'&&!e.isComposing){const target=e.target as HTMLElement;if(target.closest('button,select,textarea,summary,[contenteditable=true],input:not([type=radio]):not([type=checkbox])'))return;e.preventDefault();e.stopPropagation();if(!e.repeat&&keyboards.value.learning===null)confirmSetup();return}if(e.key==='Escape'){e.preventDefault();cancelSetup();return}if(e.key!=='Tab')return;const nodes=Array.from(setupDialog.value?.querySelectorAll<HTMLElement>('button,input:checked,select')||[]).filter(n=>n.getClientRects().length>0&&!n.hasAttribute('disabled'));const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
function cancelSetup(){setupOpen.value=false}
function originalSetup(){selectedMode.value='battle2p';matchRules.value=normalizeMatchRules({original:true,bestOf:1,durationMs:120000,koTarget:5,cooperative:false,handicap:[0,0]});soundSettings.value={...soundSettings.value,theme:'battle'};sound.value=true;requestSetup()}
function prepareMode(mode:ModeId,style:PlayStyle){selectMode(mode);playChoice.value=style}
function requestSetup(){playChoice.value=cpu.value?'cpu':inputStyle.value==='dual'&&desktopKeyboard.value?'dual':'shared';setupOpen.value=true}
function setSetupItemStyle(value:string){matchRules.value=normalizeMatchRules({...matchRules.value,original:false,cooperative:false,itemStyle:value==='boosts'?'boosts':'collect',battleStyle:value==='boosts'?'facebook':'custom'})}
function confirmSetup(){if(playChoice.value==='dual'&&(!desktopKeyboard.value||!dualReady.value))return;inputStyle.value=playChoice.value;setupOpen.value=false;if(playChoice.value==='online'){openLobby();return}cpu.value=playChoice.value==='cpu';try{localStorage.setItem('tetris-play-style',inputStyle.value)}catch{}start()}
const mapNames = MAP_OPTIONS.map(option=>option.name)
const selectedMap=ref(0)
const arena = shallowRef(new ModeSession('battle2p', false))
const selectedMode = ref<ModeId>('battle2p')
const history = ref(emptyHistory()), personalBest = ref(false)
const roundId = ref(''), rematchReady = ref<number[]>([]), rematchRequired = ref<number[]>([]), localReady = ref<number[]>([])
let lastRecordedRound = ''
function settleSeries(){if(arena.value.finished&&(!networkStarted.value||seat.value===0))series.value=recordSeriesRound(series.value,roundId.value,arena.value.winner)}
function nextRound(){captureResult();start(seriesOngoing.value)}
function restartOrContinue(){if(arena.value.finished)nextRound();else start()}
function saveHistory() { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value)) } catch {} }
function rememberCurrentMode() { history.value=rememberMode(history.value,{mode:arena.value.mode,cpu:cpu.value,map,network:networkStarted.value,spectator:hostSpectator.value,playedAt:Date.now()});saveHistory() }
function captureResult() {
  const a=arena.value
  settleSeries()
  if (!a.finished || !roundId.value || lastRecordedRound===roundId.value) return
  lastRecordedRound=roundId.value
  if (networkStarted.value && hostSpectator.value && seat.value===0) return
  const g=a.players[viewSeat.value]; if (!g) return
  const result=recordMatch(history.value,{mode:a.mode,score:g.score,lines:g.linesCleared,elapsed:a.elapsed,won:a.cooperative?a.winner===0:a.winner===viewSeat.value})
  history.value=result.history; personalBest.value=result.personalBest; saveHistory()
}
function playRecent(item:RecentMode) {
  leaveNetwork();selectedMode.value=item.mode;cpu.value=item.cpu;map=item.map;selectedMap.value=map;hostSpectator.value=item.spectator
  if(item.network)openLobby();else requestSetup()
}
function requestRematch() { network.send({type:'rematch',round:roundId.value,ready:!rematchReady.value.includes(seat.value)}) }
function confirmLocalRematch(index:number) { localReady.value=localReady.value.includes(index)?localReady.value.filter(i=>i!==index):[...localReady.value,index];if(localReady.value.length===2)nextRound() }

const mobile = ref(false), phoneLandscape=ref(false)
const controller=reactive({style:'speed' as const,moveDelay:100,moveRepeat:40,keyboardDelay:220,keyboardRepeat:100,haptics:true,size:'normal' as 'small'|'normal'|'large',leftHanded:false,hideDesktop:true})
const settingsTabs=[{id:'keyboard',name:'키보드'},{id:'touch',name:'터치 패드'},{id:'feedback',name:'피드백'},{id:'items',name:'아이템 안내'},{id:'profiles',name:'프로필'}] as const
const settingsTab=ref<'keyboard'|'touch'|'feedback'|'items'|'profiles'>('keyboard')
function settingsTabKeydown(e:KeyboardEvent){const index=settingsTabs.findIndex(tab=>tab.id===settingsTab.value);const next=e.key==='ArrowRight'?(index+1)%settingsTabs.length:e.key==='ArrowLeft'?(index+settingsTabs.length-1)%settingsTabs.length:e.key==='Home'?0:e.key==='End'?settingsTabs.length-1:-1;if(next<0)return;e.preventDefault();settingsTab.value=settingsTabs[next]!.id;nextTick(()=>document.getElementById(`settings-${settingsTab.value}-tab`)?.focus())}
watch(cpu,value=>{try{localStorage.setItem('tetris-opponent',value?'cpu':'2p')}catch{}})
const controllerSettingsOpen=ref(false)
const controllerDialog=ref<HTMLElement|null>(null)
let controllerReturnFocus:HTMLElement|null=null
watch(controllerSettingsOpen,async open=>{if(open){controllerReturnFocus=document.activeElement as HTMLElement;await nextTick();controllerDialog.value?.querySelector<HTMLButtonElement>('button')?.focus()}else{await nextTick();if(controllerReturnFocus?.isConnected)controllerReturnFocus.focus()}})
function settingsKeydown(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();controllerSettingsOpen.value=false;return}if(e.key!=='Tab')return;const nodes=Array.from(controllerDialog.value?.querySelectorAll<HTMLElement>('button,input,select')||[]).filter(node=>node.getClientRects().length>0&&!node.hasAttribute('disabled'));const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
const controllerVisible=computed(()=>mobile.value || !controller.hideDesktop)
function openControllerSettings(){settingsTab.value=mobile.value?'touch':'keyboard';if(screen.value==='battle'&&!arena.value.paused && !arena.value.finished)togglePause();held.clear();controllerSettingsOpen.value=true}
let profilesLoaded=false
watch(()=>[controller.keyboardDelay,controller.keyboardRepeat],()=>{if(profilesLoaded)for(const p of profiles.value){p.delay=controller.keyboardDelay;p.repeat=controller.keyboardRepeat}})
watch(controller,()=>{held.clear();try{localStorage.setItem('tetris-controller',JSON.stringify(controller))}catch{};resize()},{deep:true})
const roomCode = ref(''), joinCode = ref(''), playerName = ref('Player'), seat = ref(0), roomPeers = ref<RoomPeer[]>([])
const networkError = ref(''), networkStarted = ref(false), shareURL = ref(''), qr = ref('')
const hostSpectator = ref(false)
const viewSeat = computed(()=>networkStarted.value ? Math.max(0,seat.value-(hostSpectator.value?1:0)) : 0)
function shortPlayer(index:number){return arena.value.humanSeats.has(index)?`${index+1}P`:'CPU'}
function playerLabel(index:number){if(!arena.value.humanSeats.has(index))return 'CPU';const peer=networkStarted.value?roomPeers.value.find(p=>p.seat===index+(hostSpectator.value?1:0)):null;return peer?.name?`${index+1}P · ${peer.name}`:`${profiles.value[index]?.avatar??''} ${profiles.value[index]?.name||`${index+1}P`}`}
const resultDetailsOpen=ref(true),replayOpen=ref(false)
let highlights=new MatchHighlights()
const maxCombos=ref([0,0]),highlightClips=shallowRef<import('~/game/MatchHighlights').HighlightClip[]>([])
function recordHighlights(force=false){if(screen.value!=='battle'||countdownRemaining.value>0||arena.value.paused)return;const a=arena.value;highlights.observe(a.elapsed,a.players,a.kos,force);if(a.finished)highlights.finish();maxCombos.value=[...highlights.maxCombo];highlightClips.value=[...highlights.clips]}
function readyByKeyboard(index:number){if(!localReady.value.includes(index))confirmLocalRematch(index)}
function enterRematch(index:number){if(!arena.value.finished)return;if(networkStarted.value){if(!(hostSpectator.value&&seat.value===0)&&!rematchReady.value.includes(seat.value))requestRematch()}else if(arena.value.localTwoPlayer)readyByKeyboard(index);else nextRound()}
const profiles=ref(readProfiles(null))
watch(profiles,value=>{try{localStorage.setItem(PROFILE_KEY,JSON.stringify(value))}catch{};playerName.value=value[0].name||'PLAYER 1';draw()},{deep:true})
const resultTitle=computed(()=>arena.value.cooperative?(arena.value.finished?(arena.value.winner===0?'함께 성공!':'협동 도전 종료'):'함께 도전 중'):arena.value.winner===-1?'무승부':arena.value.winner===null?'대전 중':`${playerLabel(arena.value.winner)} ${series.value.bestOf>1?(series.value.winner!==null?'최종 승리!':'이번 판 승리!'):'승리!'}`)

const humanPlayers = () => new Set(roomPeers.value.filter(p=>!hostSpectator.value || p.seat>0).map(p=>p.seat-(hostSpectator.value?1:0)))
let lastBroadcast = 0
const network = new NetworkClient(receiveNetwork)
let lastTwoPlayerMap:number|null=null
let map = 0, frame = 0, last = 0, audio: HTMLAudioElement | null = null
const images: Record<string, HTMLImageElement | HTMLCanvasElement> = {}
let monoSprites=false
const keyboardPresets=[{name:'느리게',delay:300,repeat:150},{name:'보통',delay:220,repeat:100},{name:'빠르게',delay:120,repeat:40}]
const hapticAvailable=ref(false),feedbackPulse=ref(false)
let feedbackTimer:ReturnType<typeof setTimeout>|undefined
let observedFeedback:{round:string;lines:number;kos:number;winner:number|null}|null=null
const soundSettings=ref(defaultAudioSettings()),gameAudio=new GameAudio()
function testSound(event:SoundEvent){gameAudio.unlock();gameAudio.play(event)}
function unlockAudio(){gameAudio.unlock()}
function audioVisibility(){syncAudio()}
function menuSound(event:Event){if(screen.value!=='battle'||setupOpen.value||controllerSettingsOpen.value){if((event.target as HTMLElement)?.closest('button,summary'))gameAudio.play('menu')}}
let soundObservation:{round:string;players:{lines:number;cursor:number;danger:boolean;revision:number}[];kos:number;winner:number|null}|null=null
function observeSound(){if(screen.value!=='battle')return;const a=arena.value,old=soundObservation;const now={round:roundId.value,players:a.players.map((g,i)=>({lines:g.linesCleared,cursor:g.sequenceCursor,danger:g.board.grid.slice(0,5).some(row=>row.some(Boolean)),revision:a.items[i]?.revision??0})),kos:a.kos.reduce((sum,n)=>sum+n,0),winner:a.winner};soundObservation=now;if(!old||old.round!==now.round||a.paused||countdownRemaining.value>0)return;if(old.winner===null&&now.winner!==null)gameAudio.play(now.winner===-1?(a.cooperative?'lose':'pause'):!a.cooperative&&!a.localTwoPlayer&&now.winner!==viewSeat.value?'lose':'win');if(now.kos>old.kos)gameAudio.play('ko');now.players.forEach((state,i)=>{const before=old.players[i];if(!before)return;const lines=state.lines-before.lines;if(lines>0)gameAudio.play(lines>=4?'tetris':(a.players[i]?.event?.combo??0)>0?'combo':'clear');else if(state.cursor>before.cursor)gameAudio.play('lock');if(state.danger&&!before.danger)gameAudio.play('danger');if(state.revision!==before.revision&&a.items[i]?.notice.includes('획득'))gameAudio.play('collect')})}
function feedback(event:HapticEvent){if(!controller.haptics)return;playHaptic(event);feedbackPulse.value=true;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>feedbackPulse.value=false,120)}
function observeFeedback(){if(screen.value!=='battle')return;const a=arena.value,g=a.players[viewSeat.value];if(!g || (networkStarted.value&&hostSpectator.value&&seat.value===0))return;const now={round:roundId.value,lines:g.linesCleared,kos:a.kos.reduce((sum,count)=>sum+count,0),winner:a.winner};const old=observedFeedback;observedFeedback=now;if(!old||old.round!==now.round||a.paused)return;if(old.winner===null&&now.winner!==null)feedback('finish');else if(now.kos>old.kos)feedback('ko');else if(now.lines>old.lines)feedback(now.lines-old.lines>=4?'tetris':'clear')}
const desktopKeyboard=ref(false),keyboards=ref<KeyboardStatus>(emptyKeyboardStatus())
function keyboardCommand(command:string,extra:Record<string,unknown>={}){if(['learn','assign','clear','clearAll','swap','disable'].includes(command)){held.clear();if(screen.value==='battle'&&!arena.value.paused&&!arena.value.finished&&!networkStarted.value)togglePause()}(window as any).webkit?.messageHandlers?.desktop?.postMessage({action:'dualKeyboard',command,...extra})}
function keyboardName(player:number){const id=keyboards.value.seats[player];return keyboards.value.devices.find(d=>d.id===id)?.name||'미등록'}
const dualReady=computed(()=>keyboards.value.learning===null&&keyboards.value.enabled&&keyboards.value.permission&&keyboards.value.seats.length===2&&keyboards.value.seats.every(Boolean)&&keyboards.value.seats[0]!==keyboards.value.seats[1])
const dualActive=computed(()=>inputStyle.value==='dual'&&countdownRemaining.value===0&&!setupOpen.value&&dualReady.value&&screen.value==='battle'&&arena.value.localTwoPlayer&&!networkStarted.value&&!controllerSettingsOpen.value&&!arena.value.paused)
watch(dualActive,active=>{held.clear();keyboardCommand('capture',{enabled:active})})
watch(controllerSettingsOpen,open=>{if(!open&&keyboards.value.learning!==null)keyboardCommand('cancel')})
function nativeKeyboardEvent(event:Event){
 const data=(event as CustomEvent).detail;if(!data||typeof data!=='object')return
 if(data.type==='status'){
  const wasReady=dualReady.value
  if(Array.isArray(data.devices)&&Array.isArray(data.seats))keyboards.value=data
  if(inputStyle.value==='dual'&&wasReady&&!dualReady.value&&screen.value==='battle'&&!arena.value.paused&&!networkStarted.value)togglePause()
  return
 }
 if(data.type==='reset'){held.clear();return}
 const input=nativeKey(data);if(!input)return
 const id=`hid:${input.player}:${input.key}`
 if(!input.down){held.delete(id);return}
 if(!dualActive.value)return
 if(input.key==='Enter'){if(input.down)enterRematch(input.player);return}
 if(input.key==='p'||input.key==='Escape'){togglePause();return}
 if(held.has(id))return
 const p=profiles.value[input.player as 0|1],binding=profileKey(p,input.key);if(!binding&&customProfile(p)&&keyOptions.includes(input.key))return;const mapped=binding??input.key;actionOnPlayer(input.player,mapped);triggerRef(arena)
 held.set(id,{next:clock+(mapped==='ArrowDown'?33:profiles.value[input.player as 0|1].delay),keyboard:true,player:input.player,key:mapped});draw()
}
const itemSeats=computed(()=>arena.value.localTwoPlayer&&!networkStarted.value&&!mobile.value?[0,1]:[viewSeat.value])
function openProfiles(){openControllerSettings();settingsTab.value='profiles'}
function openItemGuide(){openControllerSettings();settingsTab.value='items'}
function slotKeys(player:number){return player===1&&arena.value.localTwoPlayer&&inputStyle.value!=='dual'?['R/7','T/8','Y/9']:['V/1','B/2','N/3']}
function useItemSlot(player:number,slot:number){if(countdownRemaining.value>0||arena.value.paused||arena.value.finished)return;if(networkStarted.value&&hostSpectator.value&&seat.value===0)return;const key=['v','b','n'][slot];if(!key)return;if(networkStarted.value&&seat.value>0)network.send({type:'action',key});else {actionOnPlayer(player,key);triggerRef(arena);broadcast();draw()}}
const held = new Map<string, { next: number, keyboard?: boolean,player?:number,key?:string }>()
let clock = 0,lastSummary=0
const pieces: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
const colors: Record<string, string> = { I: 'lightblue', O: 'yellow', T: 'purple', S: 'green', Z: 'red', J: 'blue', L: 'orange' }
const paths: Record<string, string> = {
  menu: 'menu pics/intro screen.png', maps: 'menu pics/mainsetmap.png', help: 'menu pics/mainhelp.png',
  battle: 'gamescreen.png', ghost: 'tetris blocks/ghost block.png', dgrey: 'darkgreysquare.png', lgrey: 'lightgreysquare.png',
  timeback: 'tetris icons/timeback.png', decimal: 'tetris numbers/decimal.png',
  tetris: 'tetris icons/tetris.png', b2b: 'tetris icons/backtoback.png', spin: 'tetris icons/tspin double.png',
  win: 'tetris icons/you win.png', lose: 'tetris icons/you lose.png',
}
for (const [type, color] of Object.entries(colors)) paths[type] = `tetris blocks/${color} block.png`
paths.G = 'tetris blocks/linessent block.png'
for (let i = 0; i <= 9; i++) paths[`n${i}`] = `tetris numbers/${i}.png`
for (let i = 1; i <= 10; i++) paths[`combo${i}`] = `combo/${i}combo.png`
for (let i = 1; i <= 3; i++) paths[`ko${i}`] = `tetris icons/ko${i}.png`
function img(ctx: CanvasRenderingContext2D, key: string, x: number, y: number, w?: number, h?: number) {
  const image = images[monoSprites && pieces.includes(key as TetrominoType) ? `mono${key}` : key]
  if (image) ctx.drawImage(image, x, y, w ?? ('naturalWidth' in image ? image.naturalWidth : image.width), h ?? ('naturalHeight' in image ? image.naturalHeight : image.height))
}
function preview(ctx: CanvasRenderingContext2D, type: TetrominoType, cx: number, cy: number, cell: number) {
  const blocks = new Tetromino(type, 0, 0).getBlocks()
  const minX = Math.min(...blocks.map(b => b.x)), maxX = Math.max(...blocks.map(b => b.x))
  const minY = Math.min(...blocks.map(b => b.y)), maxY = Math.max(...blocks.map(b => b.y))
  for (const b of blocks) img(ctx, type, cx + (b.x - minX - (maxX - minX + 1) / 2) * cell, cy + (b.y - minY - (maxY - minY + 1) / 2) * cell, cell, cell)
}
function digits(ctx: CanvasRenderingContext2D, n: number, x: number, y: number, size = 29) {
  String(n).split('').forEach((digit, i) => img(ctx, `n${digit}`, x + i * (size - 2), y, size, size))
}
function board(ctx:CanvasRenderingContext2D,g:ModeGame,index:number,slot=index){
 const sx=slot===0?112:495,sy=138
 ctx.save()
 for(let y=0;y<20;y++)for(let x=0;x<10;x++){
  const cell=g.board.getCell(x,y),item=blockItem(cell);if(cell)img(ctx,item?'O':cell>=8&&cell<=10?'G':pieces[cell-1]!,sx+x*18,sy+y*18,18,18)
  if(cell===9){ctx.font='bold 15px Arial';ctx.fillStyle=y%2?'#ff5336':'#ffdf26';ctx.textAlign='center';ctx.fillText('☢',sx+x*18+9,sy+y*18+14)}
  if(cell===10){ctx.fillStyle='#888';ctx.fillRect(sx+x*18+2,sy+y*18+2,14,14)}
  if(item){ctx.fillStyle='#211a32';ctx.fillRect(sx+x*18+2,sy+y*18+2,14,14);ctx.font='12px Apple Color Emoji,Arial';ctx.textAlign='center';ctx.fillText(ITEMS[item].icon,sx+x*18+9,sy+y*18+14)}
 }
 if(!g.isGameOver){if(g.showGhost)for(const b of g.getGhostPiece().getBlocks())if(b.y>=0)img(ctx,'ghost',sx+b.x*18,sy+b.y*18,18,18);for(const b of g.currentPiece.getBlocks())if(b.y>=0)img(ctx,g.currentPiece.type,sx+b.x*18,sy+b.y*18,18,18)}
 if(g.heldPiece)preview(ctx,g.heldPiece.type,sx-46,186,12)
 g.previewsShown.forEach((piece,i)=>preview(ctx,piece,sx+233,[185,252,307,359,411][i]!,i===0?12:8))
 digits(ctx,g.sent,sx-57,379,29)
 // LINES SENT is an attack counter. Keep actual cleared rows visible separately.
 if(!['speed','item'].includes(arena.value.mode)){ctx.textAlign='center';ctx.font='bold 10px Arial';ctx.fillStyle='#315410';ctx.fillText('보낸 줄',sx-46,423)
 ctx.fillStyle='#def6ff';ctx.strokeStyle='#183c53';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(sx-74,434,56,51,8);ctx.fill();ctx.stroke()
 ctx.fillStyle='#23516d';ctx.font='bold 10px Arial';ctx.fillText('지운 줄',sx-46,448)
 ctx.font='900 23px Arial';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeText(String(g.linesCleared),sx-46,476,49);ctx.fillStyle='#087ab8';ctx.fillText(String(g.linesCleared),sx-46,476,49)}
 // Reference-style permanent KO counter between HOLD and LINES SENT.
 const received=arena.value.kos[1-index]??0,cx=sx-46,cy=291
 ctx.textAlign='center';ctx.lineJoin='round';ctx.strokeStyle='#171717';ctx.lineWidth=6;ctx.font='italic 900 19px Arial';ctx.strokeText('KO',cx,267);ctx.fillStyle='#fff';ctx.fillText('KO',cx,267)
 ctx.beginPath();ctx.arc(cx,cy,21,0,Math.PI*2);ctx.fillStyle='#171717';ctx.fill()
 ctx.beginPath();ctx.arc(cx,cy,18,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill()
 const koGradient=ctx.createLinearGradient(cx,cy-15,cx,cy+15);koGradient.addColorStop(0,'#ff604b');koGradient.addColorStop(1,'#c91e19')
 ctx.beginPath();ctx.arc(cx,cy,15,0,Math.PI*2);ctx.fillStyle=koGradient;ctx.fill()
 ctx.font='900 25px Arial';ctx.lineWidth=3;ctx.strokeStyle='#53130d';ctx.strokeText(String(received),cx,cy+9);ctx.fillStyle='#fff';ctx.fillText(String(received),cx,cy+9)
 ctx.font='bold 10px Arial';ctx.lineWidth=3;ctx.strokeStyle='#355216';ctx.strokeText('당한 횟수',cx,326);ctx.fillStyle='#fff';ctx.fillText('당한 횟수',cx,326)
 ctx.font='bold 12px Arial';ctx.fillStyle='#214800';ctx.fillText(`${g.score.toLocaleString()}점 · 획득 ${arena.value.kos[index]} KO`,sx+90,535)
 if(arena.value.mode==='item'&&(arena.value.items[index]!.guard>0||arena.value.items[index]!.shield>0)){ctx.strokeStyle='#55e8ff';ctx.lineWidth=4;ctx.strokeRect(sx-2,sy-2,184,364)}
 if(g.pending>0){ctx.fillStyle='#ff392f';ctx.fillRect(sx+187,498-Math.min(20,g.pending)*18,4,Math.min(20,g.pending)*18)}
 const notices:string[]=[]
 if(arena.value.winner===null&&(arena.value.koEffectTime[index]??0)>0)notices.push(`${arena.value.kos[index]} KO!`)
 if(g.effectTime>0&&g.event){if(g.event.spin)notices.push(g.event.mini?'T-SPIN MINI!':'T-SPIN!');else if(g.event.lines===4)notices.push('TETRIS!');if(g.event.combo>0)notices.push(`${g.event.combo} COMBO!`)}
 if(notices.length){ctx.textAlign='center';ctx.font='900 15px Arial';ctx.strokeStyle='#17334b';ctx.lineWidth=4;ctx.strokeText(notices.join(' · '),sx+90,557,240);ctx.fillStyle='#ffed70';ctx.fillText(notices.join(' · '),sx+90,557,240)}
 if(arena.value.finished){if(arena.value.cooperative){ctx.textAlign='center';ctx.font='900 20px Arial';ctx.strokeStyle='#17334b';ctx.lineWidth=4;const text=arena.value.winner===0?'TEAM CLEAR!':'TRY AGAIN';ctx.strokeText(text,sx+90,302);ctx.fillStyle='#fff';ctx.fillText(text,sx+90,302)}else if(arena.value.winner===-1){ctx.textAlign='center';ctx.font='900 24px Arial';ctx.strokeStyle='#131b25';ctx.lineWidth=5;ctx.strokeText('DRAW',sx+90,302);ctx.fillStyle='#fff';ctx.fillText('DRAW',sx+90,302)}else img(ctx,arena.value.winner===index?'win':'lose',sx+5,265,170,60)}

 ctx.restore()
}
function draw(){
 observeFeedback();observeSound()
 const ctx=canvas.value?.getContext('2d');if(!ctx)return
 ctx.clearRect(0,0,800,600);if(screen.value!=='battle')return
 ctx.save();ctx.filter=['speed','item'].includes(arena.value.mode)?'none':`hue-rotate(${MAP_OPTIONS[map]?.hue??0}deg)`;img(ctx,'battle',0,0,800,600);ctx.restore()
 const a=arena.value,time=Math.max(0,Math.floor(a.remaining/1000)),timer=`${Math.floor(time/60)}:${String(time%60).padStart(2,'0')}`
 ctx.textAlign='center';ctx.font='italic 900 15px Arial';ctx.fillStyle='#fff';ctx.strokeStyle='#172114';ctx.lineWidth=4
 for(const [index,x] of [[viewSeat.value,202],[1-viewSeat.value,585]] as const){const label=playerLabel(index);ctx.strokeText(label,x,88,178);ctx.fillText(label,x,88,178)}
 ctx.font='bold 9px Arial';ctx.fillStyle='#fff';ctx.strokeStyle='#182610';ctx.lineWidth=3;for(const x of [202,585]){ctx.strokeText('LOCAL BATTLE · ★ ★ ★ ★ ★',x,106);ctx.fillText('LOCAL BATTLE · ★ ★ ★ ★ ★',x,106)}
 const tx=mobile.value?202:400;ctx.font='bold 28px Arial';ctx.lineWidth=4;ctx.strokeStyle='#211b0e';ctx.strokeText(timer,tx,69);ctx.fillStyle='#ffcc32';ctx.fillText(timer,tx,69)
 ctx.font='bold 9px Arial';ctx.fillStyle='#243b11';ctx.fillText('TIME',tx,42)
 ctx.fillStyle='#dff2ff';ctx.fillRect(0,0,800,24);ctx.strokeStyle='#23435b';ctx.lineWidth=2;ctx.strokeRect(0,0,800,24);ctx.textAlign='left';ctx.font='bold 11px Arial';ctx.fillStyle='#375774';ctx.fillText(`★ ${history.value.records[a.mode]?.wins??0} WINS`,18,16);ctx.fillText('⚡ ∞ FREE PLAY',285,16);ctx.fillText(`${a.info.name} · ${mapNames[map]}`,520,16)
 board(ctx,a.players[viewSeat.value]!,viewSeat.value,0);board(ctx,a.players[1-viewSeat.value]!,1-viewSeat.value,1)
}
function drawDashboard(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle='#242424'; ctx.strokeStyle='#0b0b0b'; ctx.lineWidth=6
  ctx.beginPath(); ctx.roundRect(408,110,355,415,14); ctx.fill(); ctx.stroke()
  ctx.textAlign='center'; ctx.fillStyle='#ffe500'; ctx.font='bold 19px Arial'; ctx.fillText(arena.value.info.name,585,139)
  if(arena.value.solo) {
    const g=arena.value.players[0]!
    const stats=[['SCORE',g.score],['LINES',g.linesCleared],['LEVEL',Math.min(g.level,arena.value.mode==='marathon'?15:21)]] as const
    stats.forEach(([label,value],i)=>{ctx.fillStyle='#eee';ctx.font='bold 14px Arial';ctx.fillText(label,585,185+i*80);digits(ctx,value,585-String(value).length*12,199+i*80,27)})
    ctx.fillStyle='#b1df83';ctx.font='14px Arial';ctx.fillText(arena.value.info.target ? `${g.linesCleared} / ${arena.value.info.target} LINES` : arena.value.info.duration ? '2 MINUTE SCORE CHALLENGE' : 'ENDLESS CLASSIC',585,447)
    ctx.font='12px Arial';ctx.fillText(arena.value.mode==='survival' && g.linesCleared>=200 ? 'BONUS LEVEL · SURVIVE!' : arena.value.info.goal,585,478)
  } else {
    const opponents=arena.value.players.map((g,i)=>({g,i})).filter(p=>p.i!==viewSeat.value)
    opponents.forEach(({g,i},slot)=>{
      const x=421+(slot%3)*112,y=158+Math.floor(slot/3)*118
      ctx.strokeStyle=arena.value.attackTargets[viewSeat.value]===i?'#ffe000':'#757575';ctx.lineWidth=arena.value.attackTargets[viewSeat.value]===i?3:1;ctx.strokeRect(x,y,99,111)
      ctx.textAlign='center';ctx.font='bold 10px Arial';ctx.fillStyle=arena.value.eliminated[i]?'#fa5c40':'#eee'
      const name=networkStarted.value ? roomPeers.value.find(p=>p.seat===i)?.name || `CPU ${i}` : `CPU ${i}`
      ctx.fillText(arena.value.eliminated[i]?'OUT':name.slice(0,12),x+49,y+12)
      for(let row=0;row<20;row++)for(let col=0;col<10;col++){
        const cell=g.board.getCell(col,row);img(ctx,cell===0?'dgrey':cell>=8&&cell<=10?'G':pieces[cell-1]!,x+20+col*5.8,y+19+row*3.65,5.8,3.65)
      }
      ctx.font='9px Arial';ctx.fillStyle='#ffe000';ctx.fillText(['rally8p','sprint5p'].includes(arena.value.mode)?`${arena.value.progress(i)} / ${arena.value.info.target}`:`${g.sent} SENT · ${arena.value.kos[i]} KO`,x+49,y+105)
    })
  }
}
function selectMode(mode:ModeId) { leaveNetwork();selectedMode.value=mode;if(mode==='item')matchRules.value=normalizeMatchRules({...matchRules.value,original:false,cooperative:false,itemStyle:preferredItemStyle.value,battleStyle:preferredItemStyle.value==='collect'?'custom':'facebook'});else if(mode==='speed')matchRules.value=normalizeMatchRules({...matchRules.value,original:false,cooperative:false,itemStyle:undefined,battleStyle:matchRules.value.battleStyle??'facebook'});requestSetup() }
function leaveNetwork() { network.close(); networkStarted.value=false;roomCode.value='';roomPeers.value=[];networkError.value='';seat.value=0;rematchReady.value=[];rematchRequired.value=[];void updateShare() }
function openLobby() { leaveNetwork();if(!MODES.find(m=>m.id===selectedMode.value && m.group==='multi'))selectedMode.value='battle2p';screen.value='lobby';syncAudio();draw() }
async function updateShare() {
  if(!shareURL.value)return
  const u=new URL(shareURL.value);u.search=roomCode.value?`?room=${roomCode.value}`:'';shareURL.value=u.toString()
  qr.value=await QRCode.toDataURL(shareURL.value,{width:140,margin:1})
}
function connectRoom(type:'create'|'join') { networkError.value='연결 중…';network.connect({type,mode:selectedMode.value,code:joinCode.value,name:playerName.value,spectator:hostSpectator.value}) }
function broadcastLobby(){if(roomCode.value&&seat.value===0&&!networkStarted.value)network.send({type:'state',state:{lobby:true,mode:selectedMode.value,map:selectedMap.value,rules:matchRules.value,roundId:'',finished:false}})}
function startNetwork() { networkStarted.value=true;start();broadcast() }
function broadcast() {
  if(!networkStarted.value || seat.value!==0)return
  settleSeries();const a=arena.value
  network.send({type:'state',state:{roundId:roundId.value,rules:activeRules.value,series:series.value,countdownRemaining:countdownRemaining.value,map,pieceSeed:a.pieceSeed,mode:a.mode,remaining:a.remaining,elapsed:a.elapsed,paused:a.paused,winner:a.winner,finished:a.finished,outcome:a.outcome,kos:a.kos,koEffectTime:a.koEffectTime,eliminated:a.eliminated,target:a.target,maxCombos:highlights.maxCombo,attackTargets:a.attackTargets,items:a.items,boosts:a.boosts,itemClock:a.itemClock,humanSeats:[...a.humanSeats],players:a.players.map(g=>({data:g.serialize(),sent:g.sent,pending:g.pending,event:g.event,effectTime:g.effectTime,rallyReserve:g.rallyReserve,rallyGoal:g.rallyGoal,speedInterval:g.speedInterval,slowTime:g.slowTime,pieceSeed:g.pieceSeed,sequenceCursor:g.sequenceCursor}))}})
}
function receiveNetwork(m:any) {
  if(m.type==='welcome') {hostSpectator.value=!!m.spectator;roomCode.value=m.code;selectedMode.value=m.mode;seat.value=m.seat;roomPeers.value=m.players;networkError.value='';void updateShare();if(seat.value===0)broadcastLobby()}
  if(m.type==='roster') {roomPeers.value=m.players;if(networkStarted.value && seat.value===0){arena.value.humanSeats=humanPlayers();broadcast()}else if(seat.value===0)broadcastLobby()}
  if(m.type==='rematch-status' && m.round===roundId.value) {rematchReady.value=m.ready;rematchRequired.value=m.required}
  if(m.type==='rematch-start' && m.round===roundId.value && seat.value===0) {nextRound();return}
  if(m.type==='state' && seat.value>0) {
    const state=m.state;if(state.lobby){if(!networkStarted.value){matchRules.value=normalizeMatchRules(state.rules);if(validMap(state.map)){map=state.map;selectedMap.value=map}}return}activeRules.value=normalizeMatchRules(state.rules);series.value=readSeries(state.series);countdownRemaining.value=Math.max(0,Number(state.countdownRemaining)||0);if(!MODES.some(info=>info.id===state.mode))return
    const a=new ModeSession(state.mode,true,0,activeRules.value)
    for(const key of ['remaining','elapsed','paused','winner','finished','outcome','kos','koEffectTime','eliminated','target','attackTargets','items','boosts','itemClock','pieceSeed']) (a as any)[key]=state[key]
    a.humanSeats=new Set(state.humanSeats)
    a.players=state.players.map((snapshot:any)=>{const g=new ModeGame(state.mode);Object.assign(g,Game.deserialize(snapshot.data));for(const key of ['sent','pending','event','effectTime','rallyReserve','rallyGoal','speedInterval','slowTime','pieceSeed','sequenceCursor']) (g as any)[key]=snapshot[key];return g})
    const newRound=roundId.value!==state.roundId
    if(newRound){highlights=new MatchHighlights();maxCombos.value=[0,0];highlightClips.value=[];replayOpen.value=false;roundId.value=state.roundId;personalBest.value=false;rematchReady.value=[];rematchRequired.value=[];localReady.value=[]}
    if(validMap(state.map)){map=state.map;selectedMap.value=map}
    arena.value=a;networkStarted.value=true;screen.value='battle';recordHighlights();if(Array.isArray(state.maxCombos)){highlights.maxCombo=state.maxCombos;maxCombos.value=[...state.maxCombos]};if(newRound)rememberCurrentMode();captureResult();syncAudio();draw()
  }
  if(m.type==='action' && seat.value===0 && arena.value.humanSeats.has(m.seat-(hostSpectator.value?1:0))) {
    if(m.key==='p')togglePause();else if(m.key==='Tab')arena.value.cycleTarget(m.seat-(hostSpectator.value?1:0));else actionOnPlayer(m.seat-(hostSpectator.value?1:0),m.key)
    triggerRef(arena);broadcast();draw()
  }
  if(m.type==='error' || m.type==='closed') {networkError.value=m.error;networkStarted.value=false;if(m.type==='closed'){joinCode.value=roomCode.value||joinCode.value;roomCode.value='';roomPeers.value=[];seat.value=0;void updateShare()}screen.value='lobby';syncAudio();draw()}
}
function start(continuing=false) { captureResult();if(selectedMode.value==='item'&&!matchRules.value.itemStyle)matchRules.value=normalizeMatchRules({...matchRules.value,original:false,itemStyle:'collect',battleStyle:'custom'});if(selectedMode.value==='speed'&&!matchRules.value.battleStyle)matchRules.value=normalizeMatchRules({...matchRules.value,original:false,battleStyle:'facebook'});if(matchRules.value.cooperative||matchRules.value.original)selectedMode.value='battle2p';
 // Resolve once on the host so both boards (and online guests) share this round's map.
 const twoHumans=networkStarted.value ? seat.value===0&&humanPlayers().size>=2 : !cpu.value&&selectedMode.value!=='classic'
 if(twoHumans){const previous=lastTwoPlayerMap??map;const choices=mapNames.map((_,index)=>index).filter(index=>index!==previous);map=choices[Math.floor(Math.random()*choices.length)]!;selectedMap.value=map;lastTwoPlayerMap=map;try{localStorage.setItem('tetris-last-2p-map',String(map))}catch{}}
 else if(matchRules.value.original&&!matchRules.value.cooperative){map=selectedMap.value}
if(!continuing){activeRules.value=normalizeMatchRules(matchRules.value);series.value=newSeries(activeRules.value.bestOf)}highlights=new MatchHighlights();maxCombos.value=[0,0];highlightClips.value=[];replayOpen.value=false;countdownRemaining.value=3000;resultDetailsOpen.value=true;roundId.value=`${Date.now()}-${Math.random().toString(36).slice(2)}`;personalBest.value=false;rematchReady.value=[];rematchRequired.value=[];localReady.value=[]; controllerSettingsOpen.value=false;held.clear(); arena.value = new ModeSession(selectedMode.value, selectedMode.value==='classic' || cpu.value, map,activeRules.value); if (networkStarted.value) { arena.value.cpu=true; arena.value.humanSeats = humanPlayers(); } screen.value = 'battle'; resize();rememberCurrentMode(); status.value = 'Battle started'; canvas.value?.focus(); syncAudio(); draw(); broadcast() }
function navigatePage(page:'modes'|'maps'|'help'){leaveNetwork();held.clear();screen.value=page;draw()}
function menu() { setupOpen.value=false;countdownRemaining.value=0;controllerSettingsOpen.value=false;leaveNetwork(); held.clear(); screen.value = 'menu'; syncAudio(); draw() }
function chooseMap(index: number) {if(!validMap(index))return;map=index;selectedMap.value=index;try{localStorage.setItem('tetris-map',String(index))}catch{};if(screen.value==='maps')screen.value='menu';status.value=`${mapNames[index]} 맵 선택`;broadcastLobby();draw()}
function togglePause() { gameAudio.play('pause'); if (networkStarted.value && seat.value>0) { network.send({type:'action',key:'p'}); return } if (arena.value.winner !== null) return; arena.value.paused = !arena.value.paused; triggerRef(arena); held.clear(); syncAudio(); draw(); broadcast() }
function syncAudio() {
  gameAudio.configure(soundSettings.value)
  const active=!document.hidden&&countdownRemaining.value===0&&sound.value&&screen.value==='battle'&&!arena.value.paused&&!arena.value.finished
  gameAudio.music(active&&soundSettings.value.theme==='classic')
  if(audio){audio.volume=soundSettings.value.musicVolume;if(active&&soundSettings.value.theme==='battle')void audio.play().catch(()=>{});else audio.pause()}
}
function quit() { if ((window as any).webkit?.messageHandlers?.desktop) (window as any).webkit.messageHandlers.desktop.postMessage('quit'); else { menu(); status.value = 'Close the window to quit.' } }
function actionOnPlayer(index: number, key: string) {if(['1','2','3'].includes(key))key=['v','b','n'][Number(key)-1]!;
  const g = arena.value.players[index]; if (!g || countdownRemaining.value>0 || arena.value.paused || arena.value.finished || arena.value.eliminated[index]) return
  const rotation=g.currentPiece.rotationIndex,heldType=g.heldPiece?.type,oldX=g.currentPiece.x,oldY=g.currentPiece.y
  switch(key) {
    case 'v': case 'b': case 'n': if(arena.value.useItem(index,['v','b','n'].indexOf(key))){feedback('hold');gameAudio.play('item')};break
    case 'ArrowLeft': g.moveLeft(); break
    case 'ArrowRight': g.moveRight(); break
    case 'ArrowDown': g.moveDown(true); break
    case 'ArrowUp': case 'x': g.rotate(); break
    case 'z': g.rotateLeft(); break
    case ' ': g.hardDrop(); break
    case 'c': case 'Shift': g.hold(); break
  }
  if(['ArrowLeft','ArrowRight'].includes(key)&&oldX!==g.currentPiece.x)gameAudio.play('move');else if(key==='ArrowDown'&&oldY!==g.currentPiece.y)gameAudio.play('soft');else if(['ArrowUp','x','z'].includes(key)&&rotation!==g.currentPiece.rotationIndex)gameAudio.play('rotate');else if(key===' ')gameAudio.play('drop');else if(['c','Shift'].includes(key)&&heldType!==g.heldPiece?.type)gameAudio.play('hold')
  if(index===viewSeat.value){if(['ArrowUp','x','z'].includes(key)&&rotation!==g.currentPiece.rotationIndex)feedback('rotate');else if(key===' ')feedback('drop');else if(['c','Shift'].includes(key)&&heldType!==g.heldPiece?.type)feedback('hold')}
  arena.value.checkGoals();recordHighlights(true);captureResult()
}
function action(key: string) {
  if(countdownRemaining.value>0)return
  if (networkStarted.value && seat.value>0) { gameAudio.play(['ArrowUp','x','z'].includes(key)?'rotate':key===' '?'drop':['c','Shift'].includes(key)?'hold':['v','b','n','1','2','3'].includes(key)?'item':key==='ArrowDown'?'soft':'move');if(['ArrowUp','x','z'].includes(key))feedback('rotate');else if(key===' ')feedback('drop');else if(['c','Shift'].includes(key))feedback('hold');network.send({type:'action',key}); return }
  const second: Record<string,string> = {a:'ArrowLeft',d:'ArrowRight',s:'ArrowDown',w:'ArrowUp',q:' ',e:'c',r:'v',t:'b',y:'n','7':'v','8':'b','9':'n'}
  if (second[key] && arena.value.localTwoPlayer && !networkStarted.value) {actionOnPlayer(1,second[key]!);triggerRef(arena)}
  else { if(networkStarted.value && hostSpectator.value)return; actionOnPlayer(viewSeat.value,key); triggerRef(arena); broadcast() }
}
function cycleTarget() { if(networkStarted.value && seat.value>0)network.send({type:'action',key:'Tab'});else {arena.value.cycleTarget(viewSeat.value);broadcast();draw()} }
function touchDown(key:string) { if(countdownRemaining.value>0||arena.value.paused || arena.value.finished)return; action(key); held.set(key,{next:clock+(key==='ArrowDown'?33:controller.moveDelay)}); draw() }
function touchUp(key:string) { held.delete(key) }
function keydown(e: KeyboardEvent) {
  if(controllerSettingsOpen.value||setupOpen.value)return
  if ((e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'INPUT') return
  if((e.target as HTMLElement).closest('button')&&(e.code==='Space'||e.key==='Enter'))return
  const key = classicKey(e)
  if(e.key==='Enter'&&screen.value==='battle'&&arena.value.finished){e.preventDefault();if(!e.repeat&&!e.isComposing&&!(inputStyle.value==='dual'&&!networkStarted.value))enterRematch(e.shiftKey?1:0);return}
  if(dualActive.value&&nativeGameKeys.includes(key)&&key!=='p'&&key!=='Escape'){e.preventDefault();return}
  if (key === 'Tab' && screen.value === 'battle' && arena.value.players.length>2) { e.preventDefault(); cycleTarget(); return }
  if (key === 'f') { e.preventDefault(); if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); return }
  if ((key === 'p' || key === 'Escape') && screen.value === 'battle') { e.preventDefault(); if (!e.repeat) togglePause(); return }
  if (screen.value !== 'battle' || countdownRemaining.value>0 || arena.value.paused || arena.value.winner !== null) return
  if(inputStyle.value!=='shared'||networkStarted.value){const p=profiles.value[0];const mapped=profileKey(p,key);if(!mapped&&customProfile(p)&&keyOptions.includes(key)){e.preventDefault();return}if(mapped){e.preventDefault();if(e.repeat||held.has(key))return;action(mapped);held.set(key,{next:clock+(mapped==='ArrowDown'?33:p.delay),keyboard:true,player:networkStarted.value?undefined:viewSeat.value,key:mapped});draw();return}}
  if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','x','z','c','Shift','a','d','s','w','q','e','v','b','n','r','t','y','1','2','3','7','8','9'].includes(key)) {
    e.preventDefault(); if (e.repeat || held.has(key)) return
    action(key); held.set(key, { next: clock + (key === 'ArrowDown' || key === 's' ? 33 : profiles.value[arena.value.localTwoPlayer&&!networkStarted.value&&['a','d','s','w','q','e'].includes(key)?1:0].delay), keyboard:true,player:arena.value.localTwoPlayer&&!networkStarted.value&&['a','d','s','w','q','e','r','t','y','7','8','9'].includes(key)?1:undefined }); draw()
  }
}
function keyup(e: KeyboardEvent) { held.delete(classicKey(e)) }
function blur() { held.clear(); if (screen.value === 'battle' && arena.value.winner === null) { if (!networkStarted.value) { arena.value.paused = true; triggerRef(arena); syncAudio() } } }
function step(ms: number) {
  const steps = Math.max(1, Math.ceil(ms / 16.667))
  for (let i = 0; i < steps; i++) {
    let dt = ms / steps; clock += dt
    if (screen.value !== 'battle' || arena.value.paused || arena.value.winner !== null) continue
    if(countdownRemaining.value>0){if(networkStarted.value&&seat.value>0)continue;const timing=consumeCountdown(countdownRemaining.value,dt);countdownRemaining.value=timing.remaining;dt=timing.activeMs;held.clear();if(timing.remaining===0)syncAudio();if(dt===0)continue}
    for (const [id, state] of held) {const key=state.key??id;if (['ArrowLeft','ArrowRight','ArrowDown','a','d','s'].includes(key) && clock >= state.next) { if(state.player!==undefined&&state.key!==undefined)actionOnPlayer(state.player,key);else action(key);state.next = clock + (key === 'ArrowDown' || key === 's' ? 33 : state.keyboard ? profiles.value[(state.player??0) as 0|1].repeat : controller.moveRepeat) }}
    const previousWinner = arena.value.winner; if (!networkStarted.value || seat.value===0) arena.value.update(dt); recordHighlights();if (previousWinner !== arena.value.winner) { triggerRef(arena); syncAudio() }
  }
  if (networkStarted.value && seat.value===0 && clock-lastBroadcast>=100) { lastBroadcast=clock; broadcast() }
  recordHighlights();captureResult();if(arena.value.mode==='speed'||arena.value.mode==='item'||clock-lastSummary>=100){lastSummary=clock;triggerRef(arena)};draw()
}
function loop(t: number) { step(last ? Math.min(t - last, networkStarted.value && seat.value===0 ? 1000 : 50) : 0); last = t; frame = requestAnimationFrame(loop) }
function resize() { mobile.value = window.innerWidth < 700 || window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints>0;phoneLandscape.value=mobile.value && window.innerWidth>window.innerHeight; scale.value = Math.max(.25, Math.min((window.innerWidth - 24) / (mobile.value && screen.value==='battle'?400:800), (window.innerHeight - (screen.value==='battle'?(series.value.bestOf>1?62:44):0) - (screen.value==='battle' && controllerVisible.value && !phoneLandscape.value ? (controller.size==='large'?365:controller.size==='small'?305:335) : 110) - (screen.value==='battle'&&['speed','item'].includes(arena.value.mode)?40:0)) / 600)); draw() }
watch(sound,()=>{syncAudio();try{localStorage.setItem('tetris-music',String(sound.value))}catch{}})
watch(soundSettings,()=>{syncAudio();try{localStorage.setItem('tetris-audio',JSON.stringify(soundSettings.value))}catch{}},{deep:true})
watch(countdownNumber,(number,previous)=>{if(screen.value==='battle'&&number!==previous)gameAudio.play(number>0?'count':'go')})
watch(screen,()=>{resize();syncAudio()})
onMounted(async () => {
 try{soundSettings.value=readAudioSettings(JSON.parse(localStorage.getItem('tetris-audio')||'null'));sound.value=localStorage.getItem('tetris-music')!=='false'}catch{}
 document.addEventListener('visibilitychange',audioVisibility);document.addEventListener('pointerdown',unlockAudio,true);document.addEventListener('keydown',unlockAudio,true);document.addEventListener('click',menuSound,true)
 try{matchRules.value=normalizeMatchRules(JSON.parse(localStorage.getItem('tetris-match-rules')||'null'))}catch{}
 try{const style=localStorage.getItem('tetris-play-style');if(style==='cpu'||style==='shared'||style==='dual')inputStyle.value=style}catch{}
 try{const opponent=localStorage.getItem('tetris-opponent');if(opponent==='cpu'||opponent==='2p')cpu.value=opponent==='cpu'}catch{}
 try{const previous=localStorage.getItem('tetris-last-2p-map');if(previous!==null&&validMap(Number(previous)))lastTwoPlayerMap=Number(previous)}catch{}
 try{const savedMap=Number(localStorage.getItem('tetris-map'));if(validMap(savedMap)){map=savedMap;selectedMap.value=map}}catch{}
 desktopKeyboard.value=!!(window as any).webkit?.messageHandlers?.desktop;window.addEventListener('native-keyboards',nativeKeyboardEvent);keyboardCommand('refresh')
  try { history.value=readHistory(localStorage.getItem(HISTORY_KEY)) } catch {}
  try{const saved=JSON.parse(localStorage.getItem('tetris-controller')||'{}');if(['small','normal','large'].includes(saved.size))controller.size=saved.size;for(const key of ['moveDelay','moveRepeat','keyboardDelay','keyboardRepeat'] as const){const min=key==='keyboardDelay'?100:key==='keyboardRepeat'?30:key==='moveDelay'?60:20,max=key==='keyboardDelay'?400:key==='keyboardRepeat'?200:key==='moveDelay'?200:100;if(typeof saved[key]==='number'&&Number.isFinite(saved[key]))controller[key]=Math.max(min,Math.min(max,saved[key]))};for(const key of ['leftHanded','hideDesktop','haptics'] as const)if(typeof saved[key]==='boolean')controller[key]=saved[key]}catch{}
  try{const raw=localStorage.getItem(PROFILE_KEY);profiles.value=readProfiles(raw);if(!raw)for(const p of profiles.value){p.delay=controller.keyboardDelay;p.repeat=controller.keyboardRepeat}}catch{}
  try{preferredItemStyle.value=localStorage.getItem('tetris-item-style-v2')==='boosts'?'boosts':'collect'}catch{}
  await nextTick();profilesLoaded=true;itemPreferencesReady=true
  hapticAvailable.value=hapticSupported();resize(); audio = new Audio('/classic/tetris sounds/battlemusicmp3.mp3'); audio.loop = true; audio.volume = .25
  try { const data = await (await fetch('/desktop-network')).json(); const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1'; shareURL.value = local ? data.urls?.[0] || '' : location.origin; if(shareURL.value) qr.value = await QRCode.toDataURL(shareURL.value,{width:140,margin:1}) } catch {}
  await Promise.all(Object.entries(paths).map(([key, path]) => new Promise<void>((resolve, reject) => {
    const im = new Image(); im.onload = () => { images[key] = im; resolve() }; im.onerror = () => reject(new Error(`Missing classic asset: ${path}`)); im.src = `/classic/${path}`
  })))
  for(const type of pieces) { const source=images[type]!;const monochrome=document.createElement('canvas');monochrome.width=source.width;monochrome.height=source.height;const c=monochrome.getContext('2d')!;c.filter='grayscale(1) sepia(.65)';c.drawImage(source,0,0);images[`mono${type}`]=monochrome }
  window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', blur); window.addEventListener('resize', resize)
  ;(window as any).render_game_to_text = () => JSON.stringify({ screen: screen.value, setupOpen:setupOpen.value,playChoice:playChoice.value,inputStyle:inputStyle.value,rules:activeRules.value,series:series.value,countdownRemaining:countdownRemaining.value,roundId:roundId.value, rematchReady:rematchReady.value, rematchRequired:rematchRequired.value, localReady:localReady.value, personalBest:personalBest.value,profiles:profiles.value,maxCombos:maxCombos.value,highlights:highlightClips.value.map(c=>({label:c.label,frames:c.frames.length})), history:history.value, coordinateSystem: '10x20 boards, origin top left, x right, y down', original:arena.value.original,cooperative:arena.value.cooperative,teamLines:arena.value.teamLines,goalLines:arena.value.goalLines,handicap:arena.value.handicap,mode:arena.value.mode,pieceSeed:arena.value.pieceSeed,leader:arena.value.leader,outcome:arena.value.outcome,items:arena.value.items,boosts:arena.value.boosts,itemStyle:arena.value.itemStyle,itemFever:arena.value.itemFever,nextItemIn:arena.value.nextItemIn,speedStage:arena.value.speedStage, opponent: arena.value.localTwoPlayer ? 'human' : 'CPU', seat:seat.value, network:networkStarted.value, map: mapNames[map], remaining: Math.ceil(arena.value.remaining), paused: arena.value.paused, winner: arena.value.winner, kos: arena.value.kos, koEffectTime:arena.value.koEffectTime, players: arena.value.players.map(g => ({ current: { type: g.currentPiece.type, x: g.currentPiece.x, y: g.currentPiece.y, rotation: g.currentPiece.rotationIndex }, sequenceCursor:g.sequenceCursor,hold: g.heldPiece?.type ?? null, next: g.previews, sent: g.sent, pending: g.pending, lines: g.linesCleared, score: g.score,dropInterval:g.getDropInterval(), board: g.board.grid })) })
  ;(window as any).advanceTime = (ms: number) => { step(ms) }
  const params = new URLSearchParams(location.search); const requested = params.get('mode') as ModeId; if(params.get('room')) { joinCode.value=params.get('room')!; openLobby() } else if(MODES.some(m=>m.id===requested)) { selectMode(requested) }
  draw(); frame = requestAnimationFrame(loop)
})
onUnmounted(() => { keyboardCommand('capture',{enabled:false});window.removeEventListener('native-keyboards',nativeKeyboardEvent);clearTimeout(feedbackTimer);network.close(); cancelAnimationFrame(frame); audio?.pause();gameAudio.dispose();document.removeEventListener('visibilitychange',audioVisibility);document.removeEventListener('pointerdown',unlockAudio,true);document.removeEventListener('keydown',unlockAudio,true);document.removeEventListener('click',menuSound,true); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur); window.removeEventListener('resize', resize); delete (window as any).render_game_to_text; delete (window as any).advanceTime })
</script>

<style scoped>
.item-guide-open{display:block;margin:8px auto;border:2px solid #fff;border-radius:12px;background:linear-gradient(#c4e9ff,#73b8df);color:#254d6c;font:bold 11px Arial;padding:8px 13px;min-height:36px;cursor:pointer}.item-guide-open:focus-visible{outline:3px solid #f4c63e;outline-offset:3px}

.mode-controls{font:bold 11px/1.7 Arial;color:#315977;text-align:center;margin:8px auto;max-width:800px}.mode-controls span{display:block}

.classic-shell { width:100%; min-height:100vh; background:#f3f3f3; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px; font-family:Arial,sans-serif; overflow:hidden; }
.classic-stage { flex-shrink:0; position:relative; }
.stage-content { width:800px; height:600px; position:relative; transform-origin:top left; }
canvas { display:block; width:800px; height:600px; }
.hotspot { position:absolute; border:0; background:transparent; cursor:pointer; padding:0; }
.hotspot:focus-visible { outline:3px solid #ffe100; outline-offset:2px; }
.hotspot:hover { background:#ffffff16; border-radius:24px; }
.start { left:314px; top:203px; width:156px; height:50px; }
.maps { left:322px; top:271px; width:143px; height:38px; }
.help { left:322px; top:314px; width:143px; height:38px; }
.quit { left:322px; top:357px; width:143px; height:38px; }
.map-card { width:200px; height:200px; }
.guest { left:37px; top:25px; width:43px; height:45px; }
.question { left:711px; top:25px; width:44px; height:45px; }
.classic-options { min-height:36px; margin-top:8px; flex-wrap:wrap; display:flex; align-items:center; justify-content:center; gap:16px; color:#525252; font-size:11px; font-weight:700; }
.classic-options button, .classic-options select { background:#fff; color:#444; border:1px solid #bbb; border-radius:4px; font-size:11px; padding:4px 8px; cursor:pointer; }
.classic-options label { display:flex; align-items:center; gap:5px; }
.pause-layer { position:absolute; inset:0; display:grid; place-items:center; background:#0009; }
.pause-card { width:300px; background:#272727; border:5px solid #ffaf00; border-radius:16px; color:#fff; text-align:center; padding:20px; box-shadow:0 4px 0 #151515; }
.pause-card h1 { margin:0 0 16px; color:#ffe000; font-size:30px; text-shadow:2px 2px #000; }
.pause-card p { font-size:13px; line-height:1.8; }
.pause-card button, .help-controls button { display:block; margin:8px auto; background:linear-gradient(#32e852,#079b26); border:3px solid #eee; border-radius:25px; color:white; padding:8px 24px; font-size:15px; font-weight:bold; cursor:pointer; }
.help-controls { position:absolute; left:85px; bottom:14px; width:626px; color:#fff; background:#191919; text-align:center; padding:8px; font-size:11px; }
.help-controls p { margin:3px; }
.help-controls button { display:inline-block; font-size:11px; margin:4px; padding:4px 18px; }
.sr-only { position:absolute; width:1px; height:1px; clip:rect(0,0,0,0); overflow:hidden; }
.mode-catalog,.network-lobby { position:absolute; inset:18px; padding:18px; background:#242424f5; border:5px solid #82d926; border-radius:18px; color:#fff; font-family:Arial,sans-serif; overflow:auto; }
.mode-catalog header { display:flex; align-items:center; justify-content:space-between; }
.mode-catalog h1,.network-lobby h1 { margin:0 0 12px; color:#ffe000; font-size:24px; }
.mode-columns { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
.mode-columns h2 { font-size:13px; color:#b6df9a; }
.mode-card { width:100%; display:flex; flex-direction:column; gap:5px; margin-bottom:8px; padding:10px 12px; background:linear-gradient(#4a4a4a,#292929); border:2px solid #777; border-radius:10px; color:#fff; text-align:left; cursor:pointer; }
.mode-card:hover,.mode-card:focus-visible { border-color:#8be427; background:#394d22; }
.mode-card strong { color:#ffe400; font-size:15px; }
.mode-card small { color:#ddd; font-size:11px; }
.mode-catalog footer { font-size:11px; line-height:1.7; text-align:center; }
.mode-catalog button:not(.mode-card),.network-lobby button { color:white; background:linear-gradient(#43d82d,#158c17); border:2px solid #d4f7c1; border-radius:20px; padding:7px 16px; font-weight:bold; cursor:pointer; }
.network-lobby { padding:20px 30px; text-align:center; }
.network-lobby p { font-size:13px; line-height:1.6; margin:8px; }
.lobby-form { display:grid; grid-template-columns:1fr 1fr; gap:10px; align-items:end; text-align:left; }
.lobby-form label { display:flex; flex-direction:column; font-size:12px; gap:4px; }
.network-lobby input,.network-lobby select { border:1px solid #999; background:#f9fff4; border-radius:5px; padding:8px; font-size:15px; width:100%; color:#242424; }
.network-lobby button:disabled { opacity:.4; }
.share-device { display:flex; gap:14px; align-items:center; justify-content:center; margin-top:12px; }
.share-device img { width:110px; height:110px; background:white; padding:4px; }
.share-device small { display:block; margin-top:6px; font-size:11px; }
.network-error { min-height:18px; color:#ffb261; }
.touch-controls { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; justify-content:center; touch-action:none; }
.touch-controls button { min-width:44px; min-height:42px; border:2px solid #404040; border-radius:8px; font-size:15px; font-weight:bold; color:#fff; background:linear-gradient(#555,#262626); touch-action:none; user-select:none; }
.touch-controls button:active { background:#4f941f; }
@media(max-width:700px) { .mode-catalog,.network-lobby { position:fixed; inset:8px; z-index:20000; padding:14px; box-sizing:border-box; font-family:Arial,sans-serif; } .mode-catalog h1,.network-lobby h1{font-size:20px} .mode-columns{gap:8px} .mode-card{padding:10px 8px}.mode-card strong{font-size:13px}.mode-card small{line-height:1.4}.mode-catalog header{flex-wrap:wrap;gap:8px}.network-lobby{padding:18px}.lobby-form{grid-template-columns:1fr}.share-device{flex-direction:column}.share-device img{width:100px;height:100px}.classic-options{gap:6px;font-size:10px}.classic-shell{padding:6px}.touch-controls{gap:4px}.touch-controls button{min-width:40px;min-height:44px;font-size:13px} }
</style>

<style scoped>
@media(max-width:700px){ .classic-stage{overflow:hidden} .pause-layer{width:400px} .pause-card{max-width:310px} .network-lobby .spectator-option input{width:auto} }
</style>

<style scoped>.touch-controls button:disabled{opacity:.35;cursor:default}</style>

<style scoped>
.controller-show{margin:10px;border:1px solid #bbb;border-radius:8px;padding:7px 14px;background:white;color:#444;cursor:pointer}
.controller-settings-backdrop{position:fixed;inset:0;z-index:30000;display:grid;place-items:center;padding:16px;background:#101821a8;backdrop-filter:blur(5px)}
.controller-settings{box-sizing:border-box;width:380px;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);overflow:auto;background:#f8f7f3;color:#292a32;border-radius:22px;padding:24px;font:14px/1.6 Arial;box-shadow:0 12px 70px #0005}
.controller-settings header{display:flex;align-items:center;justify-content:space-between}.controller-settings h2{font-size:22px;margin:0}.controller-settings header button{border:0;background:#e5e5e1;border-radius:50%;width:36px;height:36px;font-size:18px;cursor:pointer}.controller-settings p{color:#74757c;margin:8px 0 20px}.controller-settings label{display:block;font-weight:bold;margin:16px 0}.controller-settings select{display:block;width:100%;margin-top:6px;padding:12px;border:1px solid #c8c9c7;border-radius:10px;background:white;color:#242832;font-size:14px}.controller-settings .setting-check{display:flex;align-items:center;gap:10px;font-weight:normal}.setting-check input{width:20px;height:20px;accent-color:#913060}.controller-settings small{display:block;color:#75757b;font-size:11px;margin-top:20px}.settings-done{width:100%;padding:12px;border:0;border-radius:12px;background:#81315b;color:white;font-size:15px;font-weight:bold;margin-top:20px;cursor:pointer}
</style>

<style scoped>.classic-shell.phone-landscape{flex-direction:row;flex-wrap:wrap;align-content:center;gap:8px}.phone-landscape .classic-stage{order:1}.phone-landscape .game-controller{order:2;margin:0 8px}.phone-landscape .classic-options{order:3;width:100%;margin-top:0}</style>
<style scoped>.phone-landscape .classic-stage{overflow:hidden}.phone-landscape .pause-layer{width:400px}</style>

<style scoped>.classic-shell:has(.arcade-pages){justify-content:flex-start;background:#faf8f3;padding:0;overflow:visible}</style>

<style scoped>.classic-shell:has(.arcade-pages){background-color:#a9db53;background-image:repeating-linear-gradient(135deg,#ffffff05 0 24px,#60922107 24px 48px),linear-gradient(165deg,#71bb13 0%,#adcf30 35%,#d0ed94 100%);background-attachment:fixed}</style>

<style scoped>
.personal-best{color:#ffe000;font-weight:900}.pause-card .local-rematch{display:flex;gap:6px}.pause-card .local-rematch button{font-size:12px;padding:8px;margin:4px 0;flex:1}.pause-card button[aria-pressed=true]{background:linear-gradient(#e4cb00,#b49800);color:#1b260d}.pause-card button:disabled{opacity:.45;cursor:default}.rematch-status{color:#a4f164}.pause-card{max-height:550px;overflow-y:auto;box-sizing:border-box}
</style>



<style scoped>
.classic-shell,.classic-shell:has(.arcade-pages){background-color:#0c142b;background-image:radial-gradient(ellipse at 12% 10%,#314a7366,transparent 55%),radial-gradient(ellipse at 92% 30%,#5e347a55,transparent 45%),radial-gradient(ellipse at 30% 95%,#25535b33,transparent 40%),linear-gradient(145deg,#101b32,#0b1023 70%);background-attachment:fixed;color:#e5edfa;box-sizing:border-box}.classic-stage{border-radius:24px;overflow:hidden;box-shadow:0 20px 70px #0003}canvas:focus-visible{outline:none}.classic-options{color:#aab9d2;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-weight:500;gap:12px}.classic-options button,.controller-show{background:#ffffff10;border:1px solid #ffffff25;color:#d8e6fb;border-radius:20px;min-height:34px;padding:7px 15px}.classic-options input{accent-color:#9cb8ff}.mode-hud{display:flex;gap:14px;align-items:center;justify-content:center;max-width:800px;width:100%;box-sizing:border-box;margin-top:9px;padding:9px 12px;background:#ffffff08;border:1px solid #ffffff24;border-radius:22px;color:#cfb4fb;font:600 12px -apple-system,Arial;backdrop-filter:blur(18px)}.mode-hud span{color:#9eb3d4;font-size:10px}.pause-layer{background:#060e2266;backdrop-filter:blur(6px)}.pause-card{border:1px solid #ffffff40;background:linear-gradient(145deg,#263b5de8,#242141eb);border-radius:26px;box-shadow:inset 0 1px #ffffff30,0 20px 70px #0005;font-family:-apple-system,BlinkMacSystemFont,sans-serif}.pause-card h1{color:#e3eafa;text-shadow:none;font-size:25px}.pause-card p{color:#bfd0ec;font-size:12px}.pause-card .personal-best{color:#d7b2ff}.pause-card button{background:linear-gradient(#90a9e940,#7f73c740);border:1px solid #c5d4f875;color:#edf3ff;border-radius:30px;font-size:13px;min-height:40px;box-shadow:inset 0 1px #fff2}.pause-card button[aria-pressed=true]{background:#82a2d865;color:white}.rematch-status{color:#b6d6ff!important}.controller-settings{background:linear-gradient(145deg,#223451f5,#211f3df5);border:1px solid #ffffff36;color:#e4edfb;box-shadow:inset 0 1px #ffffff30,0 20px 70px #0006;backdrop-filter:blur(28px);font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:22px}.controller-settings header button{background:#ffffff18;color:white;border:1px solid #ffffff28}.controller-settings p,.controller-settings small{color:#a4b9d8}.controller-settings label{margin:13px 0;font-weight:500}.controller-settings select{background:#172642;color:#edf4ff;border:1px solid #ffffff2b;padding:10px;border-radius:13px}.controller-settings input[type=range]{display:block;width:100%;accent-color:#a9baff;margin-top:9px}.controller-settings label>span{display:block;font-size:10px;color:#9cb1d2}.controller-settings .setting-check input{accent-color:#b1bafb}.settings-done{background:#7894d044;border:1px solid #b3c6ee66;border-radius:28px;color:white}.phone-landscape .mode-hud{order:3}.phone-landscape .classic-options{order:4}@media(max-width:700px){.classic-options{gap:6px;font-size:9px}.classic-options button{font-size:10px;padding:5px 10px}.mode-hud{max-width:390px}}
@media(prefers-reduced-transparency:reduce){.pause-layer{backdrop-filter:none;background:#081126ba}.pause-card,.controller-settings,.mode-hud{background:#1d2a46;backdrop-filter:none}}
</style>

<style scoped>.controller-settings{max-height:85dvh;overflow-y:auto}.controller-settings h3{font-size:13px;margin:20px 0 10px}.speed-presets{display:flex;gap:8px}.speed-presets button{flex:1;min-height:40px;border-radius:22px;border:1px solid #ffffff30;background:#ffffff10;color:#e4edfb}.speed-presets button[aria-pressed=true]{background:#91acdf50;border-color:#b3c6ee80}</style>

<style scoped>.classic-stage.feedback-pulse{box-shadow:0 0 0 2px #b3d5ff,0 0 24px #7f9df366}.feedback-test{display:block;margin-top:10px;border:1px solid #ffffff30;border-radius:20px;min-height:36px;padding:6px 16px;background:#ffffff12;color:#e4edfb}.feedback-test:disabled{opacity:.4}</style>

<style scoped>
.classic-shell.battle-screen{background-color:#b8e966;background-image:repeating-linear-gradient(135deg,#ffffff12 0 24px,#6db71108 24px 48px),linear-gradient(150deg,#80d51b,#dcf7a3);color:#214800}.battle-screen .classic-stage{border-radius:8px;box-shadow:0 12px 34px #426c1833}.battle-screen .classic-options{color:#315c16;font-weight:700}.battle-screen .classic-options button,.battle-screen .controller-show{background:#fff9;border-color:#fff;color:#315c16}.battle-screen .mode-hud{background:linear-gradient(135deg,#703ae7,#b22ce2);border:2px solid #fff;color:white;box-shadow:0 4px 14px #60279730}.battle-screen .mode-hud span{color:#f0e5ff}.battle-screen .game-controller{background:linear-gradient(135deg,#135bacdd,#643acddd);border-color:#ffffffcc;box-shadow:inset 0 1px #fff8,0 8px 24px #45682433}.battle-screen .pause-card{background:linear-gradient(145deg,#3b2872,#1c2856);border:4px solid #ffc900}.battle-screen .pause-card button{background:linear-gradient(#55db30,#159a20);border:2px solid #fff}.battle-screen .classic-stage.feedback-pulse{box-shadow:0 0 0 3px #ffdc00,0 0 26px #ffc90088}
</style>

<style scoped>.dual-keyboards{padding:12px;border:1px solid #ffffff30;border-radius:16px;margin-bottom:20px}.dual-keyboards button{border:1px solid #ffffff38;background:#ffffff15;color:#edf2ff;border-radius:14px;min-height:36px;margin:4px 5px 4px 0;padding:6px 10px;font:inherit;font-size:11px}.dual-keyboards button:disabled{opacity:.4}.keyboard-seat{display:flex;align-items:center;justify-content:space-between;gap:8px}.keyboard-seat span{font-size:11px;overflow-wrap:anywhere}.dual-keyboards small{margin-top:10px}</style>

<style scoped>.item-hud{width:800px;max-width:calc(100vw - 24px);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}.item-hud.single-item{grid-template-columns:1fr;max-width:min(400px,calc(100vw - 24px))}.fever-label{grid-column:1/-1;text-align:center;color:#a3356e;font:bold 11px -apple-system,Arial}.phone-landscape .item-hud{order:3}.phone-landscape .classic-options{order:4}.item-fever .item-tray{border-color:#ffdb27;background:linear-gradient(130deg,#bd2673,#df6a2b)}@media(max-width:700px){.item-hud{grid-template-columns:1fr}.item-hud .item-tray{min-height:102px}}</style>

<style scoped>.phone-landscape .item-hud.single-item{width:220px;max-width:220px;margin:0}.phone-landscape:has(.item-hud) .game-controller{width:340px;margin:0 4px}.phone-landscape .item-hud :deep(.item-slots button){flex-direction:column;gap:2px;min-height:64px}.phone-landscape .item-hud :deep(.item-slots kbd){display:none}</style>

<style scoped>.setup-item-controls{margin:0 0 20px;padding:14px;border:1px solid #b9d49d;background:#eef7e2;border-radius:13px}.setup-item-controls label{display:block;font-size:12px;font-weight:800}.setup-item-controls select{display:block;box-sizing:border-box;width:100%;min-height:42px;margin-top:8px;border:1px solid #a7c28e;border-radius:9px;padding:8px;background:white;color:#315630;font:inherit}.setup-item-controls small{display:block;margin-top:9px;font-size:10px;line-height:1.7;color:#5c7750}</style>
