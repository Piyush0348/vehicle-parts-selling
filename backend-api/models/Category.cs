public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    // One Category has many Products (1-to-M)
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
