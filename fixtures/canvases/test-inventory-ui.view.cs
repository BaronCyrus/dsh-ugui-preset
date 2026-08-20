using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// TestInventoryUI 视图逻辑：页签筛选物品列表 + 点击物品联动详情面板 + 使用/出售。
/// 由 uGUI 制作模式按预览器 logic.js 的行为生成，序列化引用由构建管线按 bindings.json 绑定。
/// 测试数据在 TestInventoryUI.TestData.cs（partial 实现 BindFallbackItems）；
/// 接入正式数据层后删除该文件，并改用 BindItems(...) 驱动本视图。
/// </summary>
public partial class TestInventoryUI : MonoBehaviour
{
    /// <summary>物品条目：正式数据层接入时把真实数据映射为该结构。</summary>
    public sealed class ItemEntry
    {
        public string Name;
        public string Category;
        public int Count;
        public int Price;
        public string[] DescriptionLines;
    }

    private const string ConsumableCategory = "消耗品";
    private const string EmptyDetailName = "请选择物品";
    private const string EmptyDetailDesc = "点击左侧列表中的物品\n查看详细信息。";
    private const string NoSelectionDesc = "请先在列表中选择物品。";

    private static readonly string[] TabCategories = { null, "装备", "防具", "消耗品" };
    private static readonly IReadOnlyList<ItemEntry> EmptyItems = new ItemEntry[0];

    [Header("页签（顺序对应 全部/装备/防具/消耗品）")]
    [SerializeField] private Toggle[] tabToggles;

    [Header("物品格子（与 Items 一一对应）")]
    [SerializeField] private Button[] itemCellButtons;
    [SerializeField] private TMP_Text[] itemCountTexts;
    [Header("选中态标记（img - Selected，SetActive 切换显隐）")]
    [SerializeField] private GameObject[] itemSelectedMarkers;

    [Header("详情面板")]
    [SerializeField] private TMP_Text detailNameText;
    [SerializeField] private TMP_Text detailDescText;
    /// <summary>售价文本：显示当前选中物品出售可获得的金币。</summary>
    [SerializeField] private TMP_Text detailPriceText;
    [SerializeField] private Button useButton;
    [SerializeField] private Button sellButton;

    [Header("标题栏")]
    [SerializeField] private TMP_Text goldText;

    private IReadOnlyList<ItemEntry> _items;
    private int _selectedIndex = -1;
    private int _gold = 12580;

    private IReadOnlyList<ItemEntry> Items
    {
        get { return _items ?? EmptyItems; }
    }

    private void Awake()
    {
        for (int i = 0; i < tabToggles.Length; i++)
        {
            int tabIndex = i;
            tabToggles[i].onValueChanged.AddListener(isOn =>
            {
                if (isOn) ApplyFilter(tabIndex);
            });
        }
        for (int i = 0; i < itemCellButtons.Length; i++)
        {
            int itemIndex = i;
            itemCellButtons[i].onClick.AddListener(() => Select(itemIndex));
        }
        useButton.onClick.AddListener(UseSelected);
        sellButton.onClick.AddListener(SellSelected);
        BindFallbackItems();
        RefreshGoldText();
        RefreshAllCountTexts();
        ResetDetail();
        useButton.gameObject.SetActive(false);
        ApplyFilter(CurrentTabIndex());
    }

    /// <summary>接入正式数据层：传入真实物品列表并刷新展示。</summary>
    public void BindItems(IReadOnlyList<ItemEntry> items)
    {
        _items = items;
        _selectedIndex = -1;
        RefreshAllCountTexts();
        ResetDetail();
        ApplyFilter(CurrentTabIndex());
    }

    /// <summary>测试数据钩子：由 TestInventoryUI.TestData.cs 实现；删除该文件后此调用自动消失。</summary>
    partial void BindFallbackItems();

    private int CurrentTabIndex()
    {
        for (int i = 0; i < tabToggles.Length; i++)
        {
            if (tabToggles[i].isOn) return i;
        }
        return 0;
    }

    private void ApplyFilter(int tabIndex)
    {
        string category = tabIndex >= 0 && tabIndex < TabCategories.Length ? TabCategories[tabIndex] : null;
        var items = Items;
        for (int i = 0; i < itemCellButtons.Length; i++)
        {
            bool visible = i < items.Count && items[i].Count > 0 && (category == null || items[i].Category == category);
            itemCellButtons[i].gameObject.SetActive(visible);
        }
    }

    private void Select(int itemIndex)
    {
        var items = Items;
        if (itemIndex < 0 || itemIndex >= items.Count || items[itemIndex].Count <= 0) return;
        _selectedIndex = itemIndex;
        for (int i = 0; i < itemSelectedMarkers.Length; i++)
        {
            itemSelectedMarkers[i].SetActive(i == itemIndex);
        }
        ShowDetail(items[itemIndex]);
        // 仅消耗品显示使用按钮
        useButton.gameObject.SetActive(items[itemIndex].Category == ConsumableCategory);
    }

    private void Deselect()
    {
        _selectedIndex = -1;
        for (int i = 0; i < itemSelectedMarkers.Length; i++)
        {
            itemSelectedMarkers[i].SetActive(false);
        }
        useButton.gameObject.SetActive(false);
        ResetDetail();
    }

    private void ResetDetail()
    {
        detailNameText.text = EmptyDetailName;
        detailDescText.text = EmptyDetailDesc;
        detailPriceText.text = "售价：- 金币";
    }

    private void ShowDetail(ItemEntry item)
    {
        detailNameText.text = item.Name + "\u3000x" + item.Count;
        detailDescText.text = "分类：" + item.Category + "\n" + string.Join("\n", item.DescriptionLines);
        detailPriceText.text = "售价：" + item.Price + " 金币";
    }

    /// <summary>使用当前选中物品：仅消耗品可用，数量 -1，归零时从列表移除。</summary>
    private void UseSelected()
    {
        var items = Items;
        if (_selectedIndex < 0 || _selectedIndex >= items.Count)
        {
            detailDescText.text = NoSelectionDesc;
            return;
        }
        var item = items[_selectedIndex];
        if (item.Category != ConsumableCategory)
        {
            detailDescText.text = "分类：" + item.Category + "\n" + string.Join("\n", item.DescriptionLines) + "\n（装备类物品无法直接使用）";
            return;
        }
        item.Count--;
        if (item.Count <= 0)
        {
            RemoveAt(_selectedIndex);
        }
        else
        {
            RefreshCountText(_selectedIndex);
            ShowDetail(item);
        }
    }

    /// <summary>出售当前选中物品：数量 -1，金币增加单价，归零时从列表移除。</summary>
    private void SellSelected()
    {
        var items = Items;
        if (_selectedIndex < 0 || _selectedIndex >= items.Count)
        {
            detailDescText.text = NoSelectionDesc;
            return;
        }
        var item = items[_selectedIndex];
        item.Count--;
        _gold += item.Price;
        RefreshGoldText();
        if (item.Count <= 0)
        {
            RemoveAt(_selectedIndex);
        }
        else
        {
            RefreshCountText(_selectedIndex);
            ShowDetail(item);
        }
    }

    private void RemoveAt(int index)
    {
        Deselect();
        ApplyFilter(CurrentTabIndex());
    }

    private void RefreshGoldText()
    {
        goldText.text = "金币 " + _gold.ToString("N0");
    }

    private void RefreshAllCountTexts()
    {
        var items = Items;
        for (int i = 0; i < itemCountTexts.Length && i < items.Count; i++)
        {
            RefreshCountText(i);
        }
    }

    private void RefreshCountText(int index)
    {
        var items = Items;
        if (index < 0 || index >= itemCountTexts.Length || index >= items.Count) return;
        itemCountTexts[index].text = "x" + items[index].Count;
    }
}
