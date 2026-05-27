using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoServe.API.DTOs;

namespace AutoServe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReviewsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var reviews = await _context.Reviews
            .Include(r => r.Customer)
            .OrderByDescending(r => r.CreatedAt)
            .AsNoTracking()
            .Select(r => new ReviewDto
            {
                Id = r.Id,
                Rating = r.Rating,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt,
                CustomerId = r.CustomerId,
                CustomerName = r.Customer.FirstName + " " + r.Customer.LastName
            })
            .ToListAsync();

        return Ok(reviews);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var review = await _context.Reviews
            .Include(r => r.Customer)
            .AsNoTracking()
            .Where(r => r.Id == id)
            .Select(r => new ReviewDto
            {
                Id = r.Id,
                Rating = r.Rating,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt,
                CustomerId = r.CustomerId,
                CustomerName = r.Customer.FirstName + " " + r.Customer.LastName
            })
            .FirstOrDefaultAsync();

        if (review == null)
            return NotFound(new { message = $"Review with ID {id} was not found." });

        return Ok(review);
    }

    [HttpGet("customer/{customerId:int}")]
    public async Task<IActionResult> GetByCustomer(int customerId)
    {
        var exists = await _context.Customers.AnyAsync(c => c.Id == customerId);
        if (!exists)
            return NotFound(new { message = $"Customer with ID {customerId} was not found." });

        var reviews = await _context.Reviews
            .Where(r => r.CustomerId == customerId)
            .OrderByDescending(r => r.CreatedAt)
            .AsNoTracking()
            .Select(r => new ReviewDto
            {
                Id = r.Id,
                Rating = r.Rating,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt,
                CustomerId = r.CustomerId,
                CustomerName = ""
            })
            .ToListAsync();

        return Ok(reviews);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateReviewDto dto)
    {
        var customer = await _context.Customers.FindAsync(dto.CustomerId);
        if (customer == null)
            return BadRequest(new { message = "Customer not found." });

        var review = new Review
        {
            Rating = dto.Rating,
            Comment = dto.Comment,
            CustomerId = dto.CustomerId
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = review.Id }, new ReviewDto
        {
            Id = review.Id,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt,
            CustomerId = review.CustomerId,
            CustomerName = customer.FirstName + " " + customer.LastName
        });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateReviewDto dto)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null)
            return NotFound(new { message = $"Review with ID {id} was not found." });

        review.Rating = dto.Rating;
        review.Comment = dto.Comment;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null)
            return NotFound(new { message = $"Review with ID {id} was not found." });

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}