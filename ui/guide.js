import { state } from "./state.js";
import { icon } from "./dom.js";
import { switchTab } from "./engine-client.js";
import { applyMinimalMode } from "./minimal.js";
import { setButtonKeyboardLabel } from "./keyboard.js";

const SPOTLIGHT_PADDING = 7;
const VIEWPORT_MARGIN = 12;
const CARD_GAP = 16;

const GUIDE_STEPS = [
  {
    target: ".brand",
    title: "你的本地快速入口",
    description: "Perch 把常用文件路径、项目入口和速记集中在一个高密度看板里。点击左上角品牌可以随时回到文件路径。",
  },
  {
    target: ".tabs",
    title: "三个工作区",
    description: "文件路径用于快速打开和复制本机路径；项目入口负责项目目录与安全启动；速记保存随手记录的 key-value 内容。",
  },
  {
    target: "#sortMode",
    title: "按使用习惯排序",
    description: "智能排序会综合置顶、最近使用和使用频率。也可以明确切换为最近使用、最常使用、名称或最近更新。",
  },
  {
    target: "#savedViewSelect",
    title: "保存常用视图",
    description: "保存视图会记住当前 Tab、排序与筛选条件。选择已有视图可一键恢复；当前选中自定义视图时还能删除。",
  },
  {
    target: () => {
      const overflow = document.querySelector("#headerOverflow");
      return overflow && !overflow.hidden ? document.querySelector("#headerOverflowPanel") : document.querySelector("#headerToolsCollapsible");
    },
    title: "备份、迁移与交换数据",
    description: "这里可以保存视图、导出完整备份、导入 JSON，以及在检测到旧浏览器数据时执行受控迁移。窄窗口下它们会收进“更多”。",
    openOverflow: true,
  },
  {
    target: ".header-icons",
    title: "窗口与外观控制",
    description: "问号随时重新打开本指引；极简模式只保留最近入口；太阳/月亮切换主题。桌面应用还会显示全局置顶按钮。",
  },
  {
    tab: "paths",
    target: "#pathSearch",
    title: "搜索文件路径",
    description: "搜索会即时匹配名称、绝对路径、TAG、状态和备注。按 / 或 ⌘/Ctrl + K，可以直接聚焦当前 Tab 的搜索框。",
  },
  {
    tab: "paths",
    target: "#addPathButton",
    title: "添加或拖入路径",
    description: "点击加号填写一个文件路径。桌面应用中也可以把文件或文件夹直接拖进窗口，Perch 会先查重再让你确认收录。",
  },
  {
    tab: "paths",
    target: "#pathCategory",
    title: "按 TAG 与状态过滤",
    description: "TAG、路径状态、异常开关和清除按钮可以组合筛选。它们只改变当前视图，不会修改原始记录。",
  },
  {
    tab: "paths",
    target: "#refreshAllPathsButton",
    title: "检查路径是否仍然有效",
    description: "刷新会批量检查已登记路径。异常入口可只看已移动、删除、无权限或格式无效的项目，并在确认后集中清理。",
  },
  {
    tab: "paths",
    target: "#manageGroupsButton",
    title: "统一管理 TAG",
    description: "TAGS 打开全局 Registry。同名 TAG 是同一个共享 Item；修改名称或颜色后，引用它的路径、项目和速记会一起更新。",
  },
  {
    tab: "paths",
    target: "#usageHome",
    when: () => !document.querySelector("#usageHome")?.hidden,
    title: "最近入口",
    description: "这里汇总最近和高频使用的路径、项目。极简模式会把它扩展成整个快速启动首页。",
  },
  {
    tab: "paths",
    target: () => document.querySelector(".path-row") || document.querySelector(".path-list .kv-head") || document.querySelector(".path-list"),
    title: "路径记录与快捷动作",
    description: "每行突出 NAME、TAGS、NOTE 和真实路径。可以置顶、复制、在访达打开、检查或修复、升为项目、编辑与删除。",
  },
  {
    tab: "launcher",
    target: "#projectSearch",
    title: "搜索项目入口",
    description: "项目搜索会匹配名称、类型、TAG、目录和端口。切换 Tab 时，各自的搜索与筛选状态会保留。",
  },
  {
    tab: "launcher",
    target: "#addProjectButton",
    title: "登记一个项目",
    description: "点击加号录入项目真实名称、类型、绝对路径、URL、端口、启动命令建议、标签和说明。",
  },
  {
    tab: "launcher",
    target: () => hasVisibleBox(document.querySelector("#projectFilters")) ? document.querySelector("#projectFilters") : document.querySelector(".project-sticky-bar"),
    title: "按项目类型聚焦",
    description: "快速筛选 Engine、Candidate、Tool 或 Workspace。窄窗口会优先让出空间给搜索和项目列表。",
  },
  {
    tab: "launcher",
    target: () => document.querySelector(".project-row") || document.querySelector(".project-list .kv-head") || document.querySelector(".project-list"),
    title: "打开、检查与安全启动",
    description: "项目行支持在访达打开、复制路径或命令、探测状态和编辑。桌面应用接入 Project Launcher 后，还能配置并安全启动或停止项目。",
  },
  {
    tab: "notes",
    target: "#noteSearch",
    title: "搜索速记",
    description: "速记采用和文件路径一致的紧凑 key-value 布局。输入关键词即可同时查找 KEY、VALUE 与 TAG。",
  },
  {
    tab: "notes",
    target: "#noteCategory",
    title: "按 TAG 分组过滤",
    description: "选择共享 TAG 后只显示对应速记；清除会同时重置关键词与标签条件，保存视图也会记住当前标签。",
  },
  {
    tab: "notes",
    target: "#manageNoteGroupsButton",
    title: "从速记管理 TAG Registry",
    description: "这里打开完整共享 Registry，并优先展示速记引用的 TAG。名称和颜色修改仍会统一影响路径、项目与速记。",
  },
  {
    tab: "notes",
    target: "#noteUsageHome",
    when: () => !document.querySelector("#noteUsageHome")?.hidden,
    title: "最近与常用速记",
    description: "复制过的速记会按最近使用和使用频率出现在这里；点击入口即可清除冲突筛选并定位原记录。",
  },
  {
    tab: "notes",
    target: "#addNoteButton",
    title: "随手添加一条速记",
    description: "点击加号填写 KEY、VALUE 和共享 TAG。弹窗使用和文件路径一致的布局，保存前会完成必填校验。",
  },
  {
    tab: "notes",
    target: () => document.querySelector(".note-row") || document.querySelector(".note-list .kv-head") || document.querySelector(".note-list"),
    title: "复制与整理速记",
    description: "点击 VALUE 可以快速复制；右侧动作可以置顶、复制、编辑或删除。所有修改仍由 WorkPerch 单写入保存。",
  },
  {
    target: null,
    title: "准备好了",
    description: "你已经看完 Perch 的主要界面。以后点击顶部问号，可以随时重新进入指引模式。",
    centered: true,
  },
];

let sessionSteps = [];
let currentIndex = 0;
let active = false;
let savedContext = null;
let renderToken = 0;
let positionFrame = 0;

function element(selector) {
  return document.querySelector(selector);
}

function overlay() {
  return element("#guideOverlay");
}

function currentStep() {
  return sessionSteps[currentIndex] || null;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function nextLayout() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function resolveTarget(step) {
  if (!step?.target) return null;
  return typeof step.target === "function" ? step.target() : element(step.target);
}

function hasVisibleBox(target) {
  if (!target || target.hidden) return false;
  const style = getComputedStyle(target);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = target.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function setBox(target, { left, top, width, height }) {
  target.style.left = `${Math.max(0, left)}px`;
  target.style.top = `${Math.max(0, top)}px`;
  target.style.width = `${Math.max(0, width)}px`;
  target.style.height = `${Math.max(0, height)}px`;
}

function spotlightRectFor(target) {
  const rect = target.getBoundingClientRect();
  const left = Math.max(VIEWPORT_MARGIN / 2, rect.left - SPOTLIGHT_PADDING);
  const top = Math.max(VIEWPORT_MARGIN / 2, rect.top - SPOTLIGHT_PADDING);
  const right = Math.min(window.innerWidth - VIEWPORT_MARGIN / 2, rect.right + SPOTLIGHT_PADDING);
  const bottom = Math.min(window.innerHeight - VIEWPORT_MARGIN / 2, rect.bottom + SPOTLIGHT_PADDING);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function setMasks(rect) {
  const masks = Object.fromEntries([...document.querySelectorAll("[data-guide-mask]")].map((mask) => [mask.dataset.guideMask, mask]));
  if (!rect) {
    setBox(masks.top, { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight });
    for (const name of ["left", "right", "bottom"]) setBox(masks[name], { left: 0, top: 0, width: 0, height: 0 });
    return;
  }
  setBox(masks.top, { left: 0, top: 0, width: window.innerWidth, height: rect.top });
  setBox(masks.left, { left: 0, top: rect.top, width: rect.left, height: rect.height });
  setBox(masks.right, { left: rect.right, top: rect.top, width: window.innerWidth - rect.right, height: rect.height });
  setBox(masks.bottom, { left: 0, top: rect.bottom, width: window.innerWidth, height: window.innerHeight - rect.bottom });
}

function candidatePlacements(rect, cardWidth, cardHeight) {
  const centeredLeft = rect.left + (rect.width - cardWidth) / 2;
  const centeredTop = rect.top + (rect.height - cardHeight) / 2;
  return [
    { name: "below", left: centeredLeft, top: rect.bottom + CARD_GAP },
    { name: "above", left: centeredLeft, top: rect.top - cardHeight - CARD_GAP },
    { name: "right", left: rect.right + CARD_GAP, top: centeredTop },
    { name: "left", left: rect.left - cardWidth - CARD_GAP, top: centeredTop },
  ];
}

function fitsViewport(candidate, width, height) {
  return candidate.left >= VIEWPORT_MARGIN
    && candidate.top >= VIEWPORT_MARGIN
    && candidate.left + width <= window.innerWidth - VIEWPORT_MARGIN
    && candidate.top + height <= window.innerHeight - VIEWPORT_MARGIN;
}

function positionCard(rect, centered = false) {
  const card = element("#guideCard");
  const width = card.offsetWidth;
  const height = card.offsetHeight;
  card.classList.toggle("is-centered", centered);

  if (centered || !rect) {
    card.dataset.placement = "centered";
    card.style.left = `${Math.max(VIEWPORT_MARGIN, (window.innerWidth - width) / 2)}px`;
    card.style.top = `${Math.max(VIEWPORT_MARGIN, (window.innerHeight - height) / 2)}px`;
    return;
  }

  if (window.innerWidth <= 640) {
    const aboveTop = rect.top - height - CARD_GAP;
    const belowTop = rect.bottom + CARD_GAP;
    const aboveFits = aboveTop >= VIEWPORT_MARGIN;
    const belowFits = belowTop + height <= window.innerHeight - VIEWPORT_MARGIN;
    const targetInLowerHalf = rect.top + rect.height / 2 >= window.innerHeight / 2;
    let top;
    if (targetInLowerHalf && aboveFits) top = aboveTop;
    else if (!targetInLowerHalf && belowFits) top = belowTop;
    else if (aboveFits) top = aboveTop;
    else if (belowFits) top = belowTop;
    else top = targetInLowerHalf ? VIEWPORT_MARGIN : Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN);
    card.dataset.placement = top < rect.top ? "above" : "below";
    card.style.left = `${Math.min(window.innerWidth - width - VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, rect.left + (rect.width - width) / 2))}px`;
    card.style.top = `${top}px`;
    return;
  }

  const candidates = candidatePlacements(rect, width, height);
  const placement = candidates.find((candidate) => fitsViewport(candidate, width, height));
  if (placement) {
    card.dataset.placement = placement.name;
    card.style.left = `${placement.left}px`;
    card.style.top = `${placement.top}px`;
    return;
  }

  const belowSpace = window.innerHeight - rect.bottom;
  const aboveSpace = rect.top;
  const fallbackTop = belowSpace >= aboveSpace ? rect.bottom + CARD_GAP : rect.top - height - CARD_GAP;
  card.dataset.placement = belowSpace >= aboveSpace ? "below" : "above";
  card.style.left = `${Math.min(window.innerWidth - width - VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, rect.left + (rect.width - width) / 2))}px`;
  card.style.top = `${Math.min(window.innerHeight - height - VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, fallbackTop))}px`;
}

function positionGuide(target, step) {
  const spotlight = element("#guideSpotlight");
  const rect = target && hasVisibleBox(target) ? spotlightRectFor(target) : null;
  setMasks(rect);
  spotlight.hidden = !rect;
  if (rect) setBox(spotlight, rect);
  positionCard(rect, step.centered);
}

function updateGuideCopy(step) {
  element("#guideTitle").textContent = step.title;
  element("#guideDescription").textContent = step.description;
  element("#guideStepCounter").textContent = `WORKPERCH GUIDE · ${String(currentIndex + 1).padStart(2, "0")} / ${String(sessionSteps.length).padStart(2, "0")}`;
  element("#guideProgressBar").style.width = `${((currentIndex + 1) / sessionSteps.length) * 100}%`;
  element("#guidePreviousButton").disabled = currentIndex === 0;
  setButtonKeyboardLabel("#guideNextButton", currentIndex === sessionSteps.length - 1 ? "完成" : "下一步", currentIndex === sessionSteps.length - 1 ? "Enter" : "→");
}

async function revealTarget(target) {
  if (!target || target.closest(".app-header")) return;
  const rect = target.getBoundingClientRect();
  const headerBottom = element(".app-header")?.getBoundingClientRect().bottom || 0;
  const visibleTop = Math.max(headerBottom + 8, VIEWPORT_MARGIN);
  const visibleBottom = window.innerHeight - VIEWPORT_MARGIN;
  if (rect.top >= visibleTop && rect.bottom <= visibleBottom) return;
  target.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center", inline: "center" });
  if (!reducedMotion()) await wait(230);
  await nextLayout();
}

function prepareHeaderTools(step) {
  const overflow = element("#headerOverflow");
  if (!overflow || overflow.hidden) return;
  overflow.open = Boolean(step.openOverflow);
}

async function showStep(index, direction = 1) {
  if (!active) return;
  if (index < 0) index = 0;
  if (index >= sessionSteps.length) {
    closeGuide(true);
    return;
  }

  const token = ++renderToken;
  currentIndex = index;
  const step = currentStep();
  prepareHeaderTools(step);
  if (step.tab && state.activeTab !== step.tab) switchTab(step.tab, false);
  await nextLayout();
  if (!active || token !== renderToken) return;

  let target = resolveTarget(step);
  if (target && target.closest("#headerOverflowPanel")) {
    const overflow = element("#headerOverflow");
    if (overflow && !overflow.hidden) overflow.open = true;
    await nextLayout();
    target = resolveTarget(step);
  }

  if (target && !hasVisibleBox(target)) {
    const nextIndex = index + direction;
    if (nextIndex >= 0 && nextIndex < sessionSteps.length) {
      await showStep(nextIndex, direction);
      return;
    }
    target = null;
  }

  await revealTarget(target);
  if (!active || token !== renderToken) return;
  updateGuideCopy(step);
  positionGuide(target, step);
  overlay().classList.add("is-ready");
  element("#guideNextButton").focus({ preventScroll: true });
}

function restoreScrollPosition() {
  const { scrollX, scrollY } = savedContext;
  const restore = () => window.scrollTo(scrollX, scrollY);
  restore();
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
}

export function isGuideOpen() {
  return active;
}

export async function openGuide() {
  if (active) return;
  const root = overlay();
  const overflow = element("#headerOverflow");
  savedContext = {
    tab: state.activeTab,
    minimal: state.minimalMode,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    focused: document.activeElement,
    overflowOpen: Boolean(overflow?.open),
  };
  sessionSteps = GUIDE_STEPS.filter((step) => !step.when || step.when());
  currentIndex = 0;
  active = true;
  renderToken += 1;
  if (state.minimalMode) applyMinimalMode(false, { persist: false });
  root.hidden = false;
  root.setAttribute("aria-hidden", "false");
  root.classList.remove("is-ready");
  document.body.classList.add("guide-is-active");
  const button = element("#guideButton");
  button.classList.add("is-active");
  button.setAttribute("aria-pressed", "true");
  await showStep(0);
}

export function closeGuide(completed = false) {
  if (!active) return;
  active = false;
  renderToken += 1;
  cancelAnimationFrame(positionFrame);
  const root = overlay();
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  root.classList.remove("is-ready");
  document.body.classList.remove("guide-is-active");
  const button = element("#guideButton");
  button.classList.remove("is-active");
  button.setAttribute("aria-pressed", "false");
  const overflow = element("#headerOverflow");
  if (overflow) overflow.open = savedContext.overflowOpen;
  if (savedContext.minimal) applyMinimalMode(true, { persist: false });
  else switchTab(savedContext.tab, false);
  restoreScrollPosition();
  const returnFocus = savedContext.focused?.isConnected ? savedContext.focused : button;
  setTimeout(() => returnFocus?.focus?.({ preventScroll: true }), 0);
  if (completed) button.dataset.guideCompleted = "true";
  sessionSteps = [];
}

function schedulePosition() {
  if (!active || positionFrame) return;
  positionFrame = requestAnimationFrame(() => {
    positionFrame = 0;
    const step = currentStep();
    if (step) positionGuide(resolveTarget(step), step);
  });
}

function trapFocus(event) {
  const controls = ["#guideCloseButton", "#guideExitButton", "#guidePreviousButton", "#guideNextButton"]
    .map(element)
    .filter((control) => control && !control.disabled);
  if (!controls.length) return;
  const current = controls.indexOf(document.activeElement);
  const next = event.shiftKey
    ? (current <= 0 ? controls.length - 1 : current - 1)
    : (current < 0 || current === controls.length - 1 ? 0 : current + 1);
  event.preventDefault();
  controls[next].focus({ preventScroll: true });
}

export function bindGuide() {
  const button = element("#guideButton");
  const symbol = element("#guideSymbol");
  if (!button || !overlay()) return;
  button.innerHTML = icon("guide");
  symbol.innerHTML = icon("guide");
  setButtonKeyboardLabel("#guideExitButton", "退出指引", "Esc");
  setButtonKeyboardLabel("#guidePreviousButton", "上一步", "←");
  setButtonKeyboardLabel("#guideNextButton", "下一步", "→");
  button.addEventListener("click", () => active ? closeGuide() : openGuide());
  element("#guideCloseButton").addEventListener("click", () => closeGuide());
  element("#guideExitButton").addEventListener("click", () => closeGuide());
  element("#guidePreviousButton").addEventListener("click", () => showStep(currentIndex - 1, -1));
  element("#guideNextButton").addEventListener("click", () => showStep(currentIndex + 1, 1));

  overlay().addEventListener("keydown", (event) => {
    if (!active) return;
    if (event.key === "Tab") {
      trapFocus(event);
      event.stopImmediatePropagation();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeGuide();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopImmediatePropagation();
      showStep(currentIndex - 1, -1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopImmediatePropagation();
      showStep(currentIndex + 1, 1);
      return;
    }
    if (event.key === "/" || (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey))) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener("resize", schedulePosition);
  window.addEventListener("scroll", schedulePosition, true);
}
