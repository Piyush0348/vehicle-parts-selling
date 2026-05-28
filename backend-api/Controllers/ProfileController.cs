using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoServe.API.DTOs;

[Authorize]
[ApiController]
[Route("api/profile")]
public class ProfileController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProfileController(AppDbContext context) => _context = context;

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == userId.Value);

        if (customer == null) return NotFound();

        return Ok(new
        {
            customer.Id,
            customer.FirstName,
            customer.LastName,
            customer.Email,
            customer.Phone,
            customer.Role
        });
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe(UpdateCustomerDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == userId.Value);
        if (customer == null) return NotFound();

        var emailExists = await _context.Customers.AnyAsync(c => c.Email == dto.Email && c.Id != customer.Id);
        if (emailExists) return BadRequest(new { message = "Email already exists" });

        customer.FirstName = dto.FirstName;
        customer.LastName = dto.LastName;
        customer.Email = dto.Email;
        customer.Phone = dto.Phone;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    private int? GetUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var id) ? id : null;
    }
}