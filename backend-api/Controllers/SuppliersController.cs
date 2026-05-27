using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoServe.API.DTOs;

[ApiController]
[Route("api/[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly AppDbContext _context;

    public SuppliersController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var suppliers = await _context.Suppliers.ToListAsync();
        return Ok(suppliers);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null) return NotFound();
        return Ok(supplier);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSupplierDto dto)
    {
        var supplier = new Supplier
        {
            Name = dto.Name,
            ContactPerson = dto.ContactPerson,
            Email = dto.Email,
            Phone = dto.Phone
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, supplier);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateSupplierDto dto)
    {
        if (id != dto.Id) return BadRequest("ID mismatch");

        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null) return NotFound();

        supplier.Name = dto.Name;
        supplier.ContactPerson = dto.ContactPerson;
        supplier.Email = dto.Email;
        supplier.Phone = dto.Phone;

        await _context.SaveChangesAsync();
        return Ok(supplier);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null) return NotFound();

        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> BulkInsert(List<CreateSupplierDto> dtos)
    {
        var suppliers = dtos.Select(dto => new Supplier { Name = dto.Name, Email = dto.Email, Phone = dto.Phone }).ToList();
        await _context.Suppliers.AddRangeAsync(suppliers);
        await _context.SaveChangesAsync();
        return Ok(new { inserted = suppliers.Count });
    }

    [HttpGet("products")]
    public async Task<IActionResult> WithProducts()
    {
        var data = await _context.Suppliers
            .Select(s => new SupplierWithProductsDto
            {
                Id = s.Id,
                Name = s.Name,
                Email = s.Email,
                Phone = s.Phone ?? string.Empty,
                Products = s.Products.Select(p => new ProductSummaryDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Price = p.Price,
                    StockQty = p.StockQty
                }).ToList()
            })
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("count")]
    public async Task<IActionResult> Count()
        => Ok(new { totalSuppliers = await _context.Suppliers.CountAsync() });

    [HttpGet("distinct-domain")]
    public async Task<IActionResult> DistinctEmailDomains()
    {
        var domains = await _context.Suppliers
            .Where(s => s.Email != null && s.Email.Contains("@"))
            .Select(s => s.Email)
            .ToListAsync();

        var distinctDomains = domains
            .Select(s => s.Split('@')[1].ToLower())
            .Distinct()
            .ToList();

        return Ok(distinctDomains);
    }

    [HttpGet("product-count")]
    public async Task<IActionResult> ProductCountPerSupplier()
    {
        var data = await _context.Suppliers
            .Select(s => new
            {
                s.Id,
                s.Name,
                ProductCount = s.Products.Count
            })
            .ToListAsync();

        return Ok(data);
    }
}
