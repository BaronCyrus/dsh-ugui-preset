// TestInventoryUI 预览逻辑：页签筛选 + 选中联动详情 + 使用/出售（消耗数量、出售得金币）。
// 由模型按需求维护；只在预览器中运行，不修改 DSL、不影响 Unity 构建。
// 用法：module.exports = ({ events, api }) => { ... }，事件负载含 nodeId/nodeName/最新值。

// 页签 nodeId → 保留的物品 cell nodeId 列表；null 表示全部保留
const FILTERS = {
	'node-08d12dfd52e51289': null, // tab - 全部
	'node-81af14c16a943c67': [ // tab - 装备
		'node-4e114f5c2bb5ef8a', // cell - 大刀
		'node-6526afd1c950e3df', // cell - 长枪
		'node-7c3c104666ebd835' // cell - 飞刀
	],
	'node-fa8cfb8582436645': [ // tab - 防具
		'node-935170bb0486cc8b', // cell - 皮甲
		'node-aa66d130a221c0e0', // cell - 重甲
		'node-c17c31a53fbcb536', // cell - 护腿
		'node-d891921add57a98b' // cell - 手套
	],
	'node-736ae24999f29023': [ // tab - 消耗品
		'node-efa6f28f7af29de1', // cell - 蓝瓶
		'node-06bc5304188d9237', // cell - 面包
		'node-1dd1b379b628868c' // cell - 治疗卷
	]
}

// 物品数据：cell nodeId → 名称 / 分类 / 初始数量 / 单价 / 描述行 / 选中态 Image nodeId / 数量文本 nodeId
const ITEMS = {
	'node-4e114f5c2bb5ef8a': { name: '大刀', cat: '装备', count: 1, price: 300, marker: 'node-6c56f239a6d2e489', countText: 'node-c6ef362043651968', lines: ['普通的大刀。', '攻击 +12', '力量 +3'] },
	'node-6526afd1c950e3df': { name: '长枪', cat: '装备', count: 1, price: 260, marker: 'node-218217ff8e987c42', countText: 'node-de049695e1000dbd', lines: ['制式长枪。', '攻击 +10', '命中 +5'] },
	'node-7c3c104666ebd835': { name: '飞刀', cat: '装备', count: 9, price: 40, marker: 'node-7a5da69ff5ad5e17', countText: 'node-f519f70a7e9b0213', lines: ['可投掷的小刀。', '攻击 +6', '远程攻击'] },
	'node-935170bb0486cc8b': { name: '皮甲', cat: '防具', count: 1, price: 180, marker: 'node-8e27cd36433ea2ef', countText: 'node-0c2f577f1c35f669', lines: ['轻便的皮甲。', '防御 +6', '敏捷 +2'] },
	'node-aa66d130a221c0e0': { name: '重甲', cat: '防具', count: 1, price: 520, marker: 'node-1444657c3b4cbb74', countText: 'node-2344b7f4b9d0eabe', lines: ['沉重的全身甲。', '防御 +15', '敏捷 -2'] },
	'node-c17c31a53fbcb536': { name: '护腿', cat: '防具', count: 2, price: 200, marker: 'node-6f284c7079ca94d1', countText: 'node-3a5a1869576bdf14', lines: ['铁制护腿。', '防御 +8'] },
	'node-d891921add57a98b': { name: '手套', cat: '防具', count: 3, price: 120, marker: 'node-bfa6f615110fac7a', countText: 'node-516f78def506d369', lines: ['皮手套。', '防御 +4', '攻击 +2'] },
	'node-efa6f28f7af29de1': { name: '蓝瓶', cat: '消耗品', count: 7, price: 30, marker: 'node-24fa3684fffc367e', countText: 'node-6884d95392a1c7bf', lines: ['法力药剂。', '恢复 50 MP'] },
	'node-06bc5304188d9237': { name: '面包', cat: '消耗品', count: 25, price: 5, marker: 'node-405aa507904d0359', countText: 'node-7f9a39c8303cbc15', lines: ['普通的面包。', '恢复 20 HP'] },
	'node-1dd1b379b628868c': { name: '治疗卷', cat: '消耗品', count: 5, price: 80, marker: 'node-9e726971b3534d2e', countText: 'node-96af9a3dcdd7b06a', lines: ['治疗卷轴。', '恢复 100 HP'] }
}

const ALL_CELLS = Object.keys(ITEMS)

const DETAIL_NAME = 'node-0f8d8101e586da48' // txt - DetailName
const DETAIL_DESC = 'node-adc4fab26b72a4c0' // txt - DetailDesc
const GOLD_TEXT = 'node-f1bbcd88b54a1e33' // txt - Gold
const PRICE_TEXT = 'node-033d8b0e292a4cb0' // txt - DetailPrice
const BTN_USE = 'node-4bfc7463f15e6f37' // btn - 使用
const BTN_SELL = 'node-886b67c5fd360426' // btn - 出售

const EMPTY_NAME = '请选择物品'
const EMPTY_DESC = '点击左侧列表中的物品\n查看详细信息。'
const NO_SELECTION_DESC = '请先在列表中选择物品。'

module.exports = ({ events, api }) => {
	let selected = null
	let gold = 12580
	let currentFilter = null // 当前页签保留列表；null = 全部
	const counts = {}
	for (const id of ALL_CELLS) counts[id] = ITEMS[id].count

	function fmtGold(n) {
		return '金币 ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
	}

	function refreshGold() {
		api.setText(GOLD_TEXT, fmtGold(gold))
	}

	function refreshCount(id) {
		api.setText(ITEMS[id].countText, 'x' + counts[id])
	}

	function visibleByFilter(id) {
		return counts[id] > 0 && (currentFilter === null || currentFilter.includes(id))
	}

	function applyFilter(keep, label) {
		currentFilter = keep
		let shown = 0
		for (const id of ALL_CELLS) {
			const visible = visibleByFilter(id)
			api.setVisible(id, visible)
			if (visible) shown++
		}
		if (label) api.log('筛选：' + label + '（显示 ' + shown + '/' + ALL_CELLS.length + '）')
	}

	function showDetail(id) {
		const item = ITEMS[id]
		api.setText(DETAIL_NAME, item.name + '\u3000x' + counts[id])
		api.setText(DETAIL_DESC, '分类：' + item.cat + '\n' + item.lines.join('\n'))
		api.setText(PRICE_TEXT, '售价：' + item.price + ' 金币')
	}

	function resetDetail() {
		api.setText(DETAIL_NAME, EMPTY_NAME)
		api.setText(DETAIL_DESC, EMPTY_DESC)
		api.setText(PRICE_TEXT, '售价：- 金币')
	}

	function select(id) {
		selected = id
		for (const cid of ALL_CELLS) {
			api.setVisible(ITEMS[cid].marker, cid === id)
		}
		showDetail(id)
		api.setVisible(BTN_USE, ITEMS[id].cat === '消耗品') // 仅消耗品显示使用按钮
		api.log('选中物品：' + ITEMS[id].name)
	}

	function deselect() {
		selected = null
		for (const cid of ALL_CELLS) {
			api.setVisible(ITEMS[cid].marker, false)
		}
		api.setVisible(BTN_USE, false)
		resetDetail()
	}

	// 数量归零：从列表移除并重新应用当前筛选
	function remove(id) {
		counts[id] = 0
		if (selected === id) deselect()
		applyFilter(currentFilter)
		api.log(ITEMS[id].name + ' 已清空，从列表移除')
	}

	function useSelected() {
		if (!selected) {
			api.setText(DETAIL_DESC, NO_SELECTION_DESC)
			api.log('未选中物品，无法使用')
			return
		}
		const item = ITEMS[selected]
		if (item.cat !== '消耗品') {
			api.setText(DETAIL_DESC, '分类：' + item.cat + '\n' + item.lines.join('\n') + '\n（装备类物品无法直接使用）')
			api.log(item.name + ' 是装备，无法使用')
			return
		}
		counts[selected]--
		api.log('使用了 ' + item.name + '，剩余 x' + counts[selected])
		if (counts[selected] <= 0) {
			remove(selected)
		} else {
			refreshCount(selected)
			showDetail(selected)
		}
	}

	function sellSelected() {
		if (!selected) {
			api.setText(DETAIL_DESC, NO_SELECTION_DESC)
			api.log('未选中物品，无法出售')
			return
		}
		const item = ITEMS[selected]
		counts[selected]--
		gold += item.price
		refreshGold()
		api.log('出售 1 个 ' + item.name + '，+' + item.price + ' 金币（现有 ' + fmtGold(gold) + '）')
		if (counts[selected] <= 0) {
			remove(selected)
		} else {
			refreshCount(selected)
			showDetail(selected)
		}
	}

	// 初始状态：未选中物品，隐藏使用按钮
	api.setVisible(BTN_USE, false)

	events.on('toggle', ({ nodeId, nodeName, isOn }) => {
		if (!isOn || !(nodeId in FILTERS)) return
		applyFilter(FILTERS[nodeId], nodeName.replace(/^tab - /, ''))
	})

	events.on('button', ({ nodeId }) => {
		if (nodeId in ITEMS) {
			select(nodeId)
			return
		}
		if (nodeId === BTN_USE) {
			useSelected()
			return
		}
		if (nodeId === BTN_SELL) {
			sellSelected()
		}
	})
}
