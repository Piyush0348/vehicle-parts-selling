using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/ai")]
public class AIController : ControllerBase
{
    [HttpGet("predict")]
    public IActionResult Predict(int mileage, int year)
    {
        int age = DateTime.Now.Year - year;

        if (mileage > 50000 || age > 5)
            return Ok("High failure risk");

        if (mileage > 30000)
            return Ok("Medium risk");

        return Ok("Low risk");
    }
}