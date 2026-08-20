using System.Collections.Generic;

/// <summary>
/// TestInventoryUI 测试数据（partial）。接入正式数据层后删除本文件即可移除全部测试数据，
/// 并改用 TestInventoryUI.BindItems(...) 传入真实数据。
/// </summary>
public partial class TestInventoryUI
{
    partial void BindFallbackItems()
    {
        _items = new List<ItemEntry>
        {
            new ItemEntry { Name = "大刀", Category = "装备", Count = 1, Price = 300, DescriptionLines = new[] { "普通的大刀。", "攻击 +12", "力量 +3" } },
            new ItemEntry { Name = "长枪", Category = "装备", Count = 1, Price = 260, DescriptionLines = new[] { "制式长枪。", "攻击 +10", "命中 +5" } },
            new ItemEntry { Name = "飞刀", Category = "装备", Count = 9, Price = 40, DescriptionLines = new[] { "可投掷的小刀。", "攻击 +6", "远程攻击" } },
            new ItemEntry { Name = "皮甲", Category = "防具", Count = 1, Price = 180, DescriptionLines = new[] { "轻便的皮甲。", "防御 +6", "敏捷 +2" } },
            new ItemEntry { Name = "重甲", Category = "防具", Count = 1, Price = 520, DescriptionLines = new[] { "沉重的全身甲。", "防御 +15", "敏捷 -2" } },
            new ItemEntry { Name = "护腿", Category = "防具", Count = 2, Price = 200, DescriptionLines = new[] { "铁制护腿。", "防御 +8" } },
            new ItemEntry { Name = "手套", Category = "防具", Count = 3, Price = 120, DescriptionLines = new[] { "皮手套。", "防御 +4", "攻击 +2" } },
            new ItemEntry { Name = "蓝瓶", Category = "消耗品", Count = 7, Price = 30, DescriptionLines = new[] { "法力药剂。", "恢复 50 MP" } },
            new ItemEntry { Name = "面包", Category = "消耗品", Count = 25, Price = 5, DescriptionLines = new[] { "普通的面包。", "恢复 20 HP" } },
            new ItemEntry { Name = "治疗卷", Category = "消耗品", Count = 5, Price = 80, DescriptionLines = new[] { "治疗卷轴。", "恢复 100 HP" } },
        };
    }
}
