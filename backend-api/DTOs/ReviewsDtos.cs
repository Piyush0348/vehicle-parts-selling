using System.ComponentModel.DataAnnotations;

namespace AutoServe.API.DTOs;

public class CreateReviewDto
{
    [Required]
    [Range(1, 5)]
    public int Rating { get; set; }

    public string? Comment { get; set; }

    [Required]
    public int CustomerId { get; set; }
}

public class UpdateReviewDto
{
    [Required]
    [Range(1, 5)]
    public int Rating { get; set; }

    public string? Comment { get; set; }
}

public class ReviewDto
{
    public int Id { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
}