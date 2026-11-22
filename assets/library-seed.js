/* Starter content for the SAT Library. The admin can edit or delete all of it and add videos. */
window.AMRO_LIB_SEED = (function () {
const T = (domain, title, guide, practice, extra) => Object.assign({ domain, title, guide, practice }, extra || {});
return [
/* ================= MATH: ALGEBRA ================= */
T('Algebra', 'Linear equations in one variable', `# Key idea
Do the same operation to both sides until the variable is alone.
- Distribute first, then combine like terms, then isolate x.
- Clear fractions by multiplying every term by the common denominator.
- No solution: the variables cancel and leave a false statement, such as 3 = 5.
- Infinitely many solutions: the variables cancel and leave a true statement, such as 5 = 5.
# SAT tip
Read the last line first. The question often asks for an expression such as 2x + 1, not x itself, and there may be a shortcut.`, [
['If 4(x − 3) = 2x + 6, what is the value of x?', ['3', '6', '9', '12'], 2, '4x − 12 = 2x + 6, so 2x = 18 and x = 9.'],
['For what value of k does the equation 3x + k = 3x − 5 have infinitely many solutions?', ['−5', '0', '3', '5'], 0, 'Both sides have 3x, so the equation is true for every x only when k = −5.'],
['If x/3 + x/6 = 5, what is the value of x?', ['5', '10', '15', '30'], 1, 'x/3 + x/6 = 2x/6 + x/6 = x/2. So x/2 = 5 and x = 10.']]),

T('Algebra', 'Linear equations in two variables', `# Key idea
A linear equation in two variables has many solutions: every point (x, y) on its line.
- Slope-intercept form: y = mx + b. m is the slope, b is the y-intercept.
- Standard form: ax + by = c.
- A point lies on the line if its x and y make the equation true.
# Word problems
- The slope is the rate (per hour, per item).
- The y-intercept is the starting value or fixed fee.`, [
['A plumber charges a $40 visit fee plus $25 per hour. Which equation gives the total cost C, in dollars, for h hours of work?', ['C = 40h + 25', 'C = 25h + 40', 'C = 65h', 'C = 25(h + 40)'], 1, 'The rate ($25 per hour) multiplies h; the fixed fee ($40) is added once.'],
['Which point lies on the line 2x + 3y = 12?', ['(1, 3)', '(3, 2)', '(4, 2)', '(6, 1)'], 1, '2(3) + 3(2) = 6 + 6 = 12. Check the others: 11, 14 and 15.'],
['What is the y-intercept of the line y = 3x − 7?', ['−7', '−3', '3', '7'], 0, 'In y = mx + b, the y-intercept is b, which is −7.']]),

T('Algebra', 'Linear functions', `# Key idea
A linear function changes by the same amount every time x increases by 1.
- f(x) = mx + b. To evaluate, substitute the x-value.
- Slope from two points: (y₂ − y₁) / (x₂ − x₁).
- Parallel lines have equal slopes. Perpendicular slopes are negative reciprocals (2 and −1/2).
- In a table, a constant change in y for equal steps in x means the function is linear.`, [
['If f(x) = 5x − 2, what is f(3)?', ['11', '13', '15', '17'], 1, 'f(3) = 5(3) − 2 = 15 − 2 = 13.'],
['What is the slope of the line through (1, 4) and (3, 10)?', ['2', '3', '4', '6'], 1, '(10 − 4) / (3 − 1) = 6 / 2 = 3.'],
['A line is perpendicular to y = 2x + 1. What is its slope?', ['−2', '−1/2', '1/2', '2'], 1, 'Perpendicular slopes are negative reciprocals: the negative reciprocal of 2 is −1/2.']]),

T('Algebra', 'Systems of two linear equations', `# Methods
- Substitution: solve one equation for a variable and substitute into the other.
- Elimination: add or subtract the equations to cancel a variable.
- Desmos: graph both lines and tap the intersection.
# Number of solutions
- One solution: different slopes.
- No solution: same slope, different y-intercepts (parallel lines).
- Infinitely many: the same line (one equation is a multiple of the other).`, [
['If x + y = 12 and x − y = 2, what is the value of y?', ['5', '6', '7', '10'], 0, 'Add the equations: 2x = 14, so x = 7. Then y = 12 − 7 = 5.'],
['If 2x + 3y = 13 and x = 2y − 4, what is the value of x?', ['1', '2', '3', '4'], 1, 'Substitute: 2(2y − 4) + 3y = 13, so 7y = 21 and y = 3. Then x = 2(3) − 4 = 2.'],
['For what value of a does the system y = ax + 3 and y = 4x − 1 have no solution?', ['−4', '−1', '3', '4'], 3, 'No solution means parallel lines: equal slopes and different intercepts. So a = 4.']]),

T('Algebra', 'Linear inequalities', `# Key idea
Solve like an equation, with one extra rule.
- Multiplying or dividing both sides by a negative number flips the inequality sign.
- "At least" means ≥. "At most" or "no more than" means ≤. "More than" means >.
- To check an answer, substitute a value and see if the statement is true.`, [
['Which inequality is equivalent to −2x + 5 > 11?', ['x > −3', 'x < −3', 'x > 3', 'x < 3'], 1, '−2x > 6. Dividing by −2 flips the sign: x < −3.'],
['A student has $50 and each book costs $8. Which inequality shows the number of books b she can buy?', ['8b ≥ 50', '8b ≤ 50', '50b ≤ 8', 'b + 8 ≤ 50'], 1, 'Total spent, 8b, must be at most 50.'],
['Which value of x satisfies 3x − 4 ≥ 11?', ['2', '3', '4', '5'], 3, '3x ≥ 15, so x ≥ 5. Only 5 works.']]),

/* ================= MATH: ADVANCED MATH ================= */
T('Advanced Math', 'Equivalent expressions', `# Tools
- Distribute and combine like terms.
- Factor: take out the greatest common factor first.
- Difference of squares: a² − b² = (a − b)(a + b).
- Perfect square: (a + b)² = a² + 2ab + b².
# Exponent rules
- xᵃ · xᵇ = xᵃ⁺ᵇ and (xᵃ)ᵇ = xᵃᵇ.
- x^(1/n) is the nth root of x.
# SAT tip
If algebra is slow, pick a value for x and test which choice gives the same result.`, [
['Which expression is equivalent to (x + 3)²?', ['x² + 9', 'x² + 3x + 9', 'x² + 6x + 9', 'x² + 6x + 6'], 2, '(x + 3)(x + 3) = x² + 3x + 3x + 9 = x² + 6x + 9.'],
['Which expression is equivalent to x² − 49?', ['(x − 7)²', '(x − 7)(x + 7)', '(x + 7)²', '(x − 49)(x + 1)'], 1, 'Difference of squares: x² − 7² = (x − 7)(x + 7).'],
['Which expression is equivalent to x⁵ · x³?', ['x²', 'x⁸', 'x¹⁵', '2x⁸'], 1, 'Multiply powers with the same base by adding exponents: 5 + 3 = 8.']]),

T('Advanced Math', 'Nonlinear equations and systems', `# Quadratics
- Factor when you can: x² − 7x + 10 = (x − 2)(x − 5).
- Quadratic formula: x = (−b ± √(b² − 4ac)) / 2a.
- Discriminant b² − 4ac: positive gives 2 real solutions, zero gives 1, negative gives none.
- For ax² + bx + c = 0, the sum of solutions is −b/a and the product is c/a.
# Systems with a curve
Substitute the line into the curve, or graph both in Desmos and count intersections.`, [
['What are the solutions of x² − 7x + 10 = 0?', ['2 and 5', '−2 and −5', '1 and 10', '−1 and −10'], 0, '(x − 2)(x − 5) = 0, so x = 2 or x = 5.'],
['How many real solutions does x² + 4x + 5 = 0 have?', ['0', '1', '2', 'Infinitely many'], 0, 'Discriminant: 16 − 20 = −4, which is negative, so there are no real solutions.'],
['If y = x² and y = 4, what are all possible values of x?', ['2 only', '−2 and 2', '4 only', '16'], 1, 'x² = 4 gives x = 2 or x = −2.']]),

T('Advanced Math', 'Nonlinear functions', `# Quadratic functions
- Vertex form y = a(x − h)² + k has vertex (h, k).
- a > 0 opens up (minimum); a < 0 opens down (maximum).
- Zeros (x-intercepts) are the x-values where f(x) = 0.
# Exponential functions
- Growth: a(1 + r)ᵗ. Decay: a(1 − r)ᵗ, where r is the rate as a decimal.
- "Doubles every 3 years" is a · 2^(t/3).`, [
['What is the vertex of the graph of y = (x − 3)² + 2?', ['(−3, 2)', '(3, 2)', '(3, −2)', '(2, 3)'], 1, 'In y = (x − h)² + k the vertex is (h, k) = (3, 2).'],
['A town of 10,000 people grows by 3% each year. Which expression gives the population after t years?', ['10,000(0.03)ᵗ', '10,000(1.03)ᵗ', '10,000 + 0.03t', '10,000(1.3)ᵗ'], 1, 'Growth of 3% multiplies by 1 + 0.03 = 1.03 each year.'],
['What are the zeros of f(x) = x² − 9?', ['9 only', '3 only', '−3 and 3', '0'], 2, 'x² − 9 = 0 gives x² = 9, so x = 3 or x = −3.']]),

/* ================= MATH: PROBLEM-SOLVING & DATA ANALYSIS ================= */
T('Problem-Solving & Data Analysis', 'Ratios, rates, proportions and units', `# Key idea
- Set up a proportion with matching units in the same positions, then cross-multiply.
- Unit conversion: multiply by fractions equal to 1 (such as 60 min / 1 h) so the units cancel.
- Distance = rate × time.
- Find the unit rate (cost per one item) when quantities differ.`, [
['Three notebooks cost $4.50. At this rate, how much do 8 notebooks cost?', ['$10.50', '$12.00', '$13.50', '$14.00'], 1, 'One notebook costs $1.50, so 8 cost 8 × 1.50 = $12.00.'],
['How many minutes are in 2.5 hours?', ['120', '140', '150', '250'], 2, '2.5 × 60 = 150.'],
['On a map, 1 cm represents 5 km. Two towns are 7 cm apart on the map. What is the actual distance?', ['12 km', '30 km', '35 km', '75 km'], 2, '7 × 5 = 35 km.']]),

T('Problem-Solving & Data Analysis', 'Percentages', `# Key idea
- Percent = part ÷ whole × 100.
- Increase by p%: multiply by (1 + p/100). Decrease by p%: multiply by (1 − p/100).
- Successive changes multiply; they do not add. +10% then −10% is ×1.1 × 0.9 = ×0.99.
- Percent change = (new − old) ÷ old × 100.`, [
['An $80 jacket is on sale for 25% off. What is the sale price?', ['$55', '$60', '$65', '$70'], 1, '80 × 0.75 = 60.'],
['A price rises from $40 to $50. What is the percent increase?', ['10%', '20%', '25%', '50%'], 2, '(50 − 40) ÷ 40 = 0.25, which is 25%.'],
['A value increases by 10% and then decreases by 10%. What is the overall change?', ['No change', '1% decrease', '1% increase', '10% decrease'], 1, '1.10 × 0.90 = 0.99, a 1% decrease.']]),

T('Problem-Solving & Data Analysis', 'One-variable data', `# Measures
- Mean: sum ÷ count. Median: middle value after sorting. Range: maximum − minimum.
- An outlier moves the mean much more than the median.
- Standard deviation measures spread: data clustered near the mean has a smaller standard deviation.
# Graphs
Read dot plots, histograms and box plots carefully: check the scale and what each bar or dot counts.`, [
['What is the median of 3, 9, 4, 7, 12?', ['4', '7', '9', '12'], 1, 'Sorted: 3, 4, 7, 9, 12. The middle value is 7.'],
['The value 60 is added to the data set 10, 12, 13, 15. Which measure increases more?', ['Mean', 'Median', 'They increase equally', 'Neither changes'], 0, 'The outlier 60 pulls the mean up a lot (from 12.5 to 22); the median only moves from 12.5 to 13.'],
['The mean of five numbers is 8. What is their sum?', ['13', '30', '40', '45'], 2, 'Sum = mean × count = 8 × 5 = 40.']]),

T('Problem-Solving & Data Analysis', 'Two-variable data', `# Scatterplots and models
- A line of best fit predicts y from x.
- The slope is the predicted change in y for each 1-unit increase in x.
- The y-intercept is the predicted y when x = 0 (it may not make sense in context).
- Residual = actual value − predicted value.
- Be careful predicting far outside the range of the data.`, [
['A line of best fit is y = 2.5x + 10, where x is hours studied and y is the test score. What score does the model predict for 4 hours?', ['14', '20', '22.5', '40'], 1, '2.5(4) + 10 = 10 + 10 = 20.'],
['In the model y = 2.5x + 10, what does 2.5 represent?', ['The score with 0 hours of study', 'The predicted increase in score for each additional hour', 'The total number of hours studied', 'The highest possible score'], 1, 'The slope is the predicted change in y per one unit of x.'],
['A data point has an actual value of 30 and a predicted value of 26. What is its residual?', ['−4', '4', '26', '56'], 1, 'Residual = actual − predicted = 30 − 26 = 4.']]),

T('Problem-Solving & Data Analysis', 'Probability and conditional probability', `# Key idea
- Probability = favorable outcomes ÷ total outcomes.
- P(not A) = 1 − P(A).
- In two-way tables, "given" tells you the denominator: use only that row or column.
- Independent events: P(A and B) = P(A) × P(B).`, [
['A bag has 3 red, 5 blue and 2 green marbles. What is the probability of choosing a blue marble?', ['1/5', '3/10', '1/2', '5/8'], 2, '5 blue out of 10 marbles = 1/2.'],
['Of 40 students, 24 play a sport, and 9 of those also play music. If a student who plays a sport is chosen at random, what is the probability that the student also plays music?', ['9/40', '3/8', '3/5', '9/31'], 1, 'Given "plays a sport", the denominator is 24: 9/24 = 3/8.'],
['A fair coin is flipped twice. What is the probability of getting two heads?', ['1/2', '1/3', '1/4', '1/8'], 2, '1/2 × 1/2 = 1/4.']]),

T('Problem-Solving & Data Analysis', 'Sample statistics and margin of error', `# Key idea
- A random sample lets you generalize to the population it was drawn from, and only that population.
- An estimate with a margin of error gives a plausible range: estimate ± margin.
- Larger random samples usually give a smaller margin of error.`, [
['A survey estimates that 62% of residents support a plan, with a margin of error of 4%. Which range is plausible?', ['60% to 64%', '58% to 66%', '54% to 70%', '62% to 66%'], 1, '62 − 4 = 58 and 62 + 4 = 66.'],
['How does increasing the size of a random sample usually affect the margin of error?', ['It increases', 'It decreases', 'It does not change', 'It doubles'], 1, 'More data gives a more precise estimate, so the margin of error shrinks.'],
['Students at one school were selected at random and surveyed. To which group can the results be generalized?', ['All students in the country', 'All students at that school', 'All teenagers', 'All teachers at that school'], 1, 'Results generalize only to the population that was sampled.']]),

T('Problem-Solving & Data Analysis', 'Evaluating statistical claims', `# Key idea
- Random assignment to groups (an experiment) supports cause-and-effect conclusions.
- Without random assignment (an observational study), you can only claim an association.
- Random sampling allows generalizing to the population; volunteer samples are often biased.`, [
['Researchers randomly assigned 200 volunteers to a new diet or their usual diet. The new-diet group lost more weight on average. Which conclusion is best supported?', ['The new diet causes weight loss for all people', 'The new diet likely causes more weight loss for people similar to the volunteers', 'No conclusion can be drawn', 'There is only an association'], 1, 'Random assignment supports cause, but volunteers were not randomly sampled, so generalize only to similar people.'],
['A survey (with no random assignment) found that people who drink more coffee tend to sleep less. Which conclusion is best supported?', ['Coffee causes people to sleep less', 'There is an association between coffee and sleep', 'Sleeping less causes people to drink coffee', 'Coffee and sleep are unrelated'], 1, 'Observational data shows association, not cause.'],
['Which sample is most likely to be biased for estimating the opinion of a whole city?', ['A random sample from a list of all residents', 'People who chose to answer a website poll', 'Randomly selected households', 'A random sample from the voter list'], 1, 'Volunteers are self-selected and often differ from the population.']]),

/* ================= MATH: GEOMETRY & TRIGONOMETRY ================= */
T('Geometry & Trigonometry', 'Area and volume', `# Formulas (all on the SAT reference sheet)
- Rectangle lw, triangle ½bh, circle πr².
- Box lwh, cylinder πr²h, sphere (4/3)πr³, cone (1/3)πr²h.
# Scaling
If every length is multiplied by k, area is multiplied by k² and volume by k³.`, [
['What is the volume of a box measuring 3 by 4 by 5?', ['12', '47', '60', '94'], 2, '3 × 4 × 5 = 60.'],
['What is the area of a circle with radius 5?', ['5π', '10π', '25π', '100π'], 2, 'πr² = π(5²) = 25π.'],
['Every edge of a cube is doubled. By what factor is its volume multiplied?', ['2', '4', '6', '8'], 3, 'Volume scales by k³ = 2³ = 8.']]),

T('Geometry & Trigonometry', 'Lines, angles and triangles', `# Facts to know
- Angles on a straight line sum to 180°. Angles in a triangle sum to 180°.
- Vertical angles are equal.
- Parallel lines cut by a transversal: corresponding and alternate interior angles are equal.
- Similar triangles have equal angles and proportional sides.
- In an isosceles triangle, the base angles are equal.`, [
['Two angles of a triangle measure 50° and 60°. What is the third angle?', ['60°', '70°', '80°', '90°'], 1, '180 − 50 − 60 = 70.'],
['An angle measures 35°. What is the measure of its vertical angle?', ['35°', '55°', '145°', '325°'], 0, 'Vertical angles are equal.'],
['Triangles ABC and DEF are similar. AB = 4, DE = 10 and BC = 6. What is EF?', ['12', '15', '16', '24'], 1, 'Scale factor 10/4 = 2.5, so EF = 6 × 2.5 = 15.']]),

T('Geometry & Trigonometry', 'Right triangles and trigonometry', `# Key idea
- Pythagorean theorem: a² + b² = c², where c is the hypotenuse.
- SOH-CAH-TOA: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent.
- Special triangles: 30-60-90 has sides x, x√3, 2x. 45-45-90 has sides x, x, x√2.
- Complementary angles: sin(x°) = cos(90° − x°).`, [
['A right triangle has legs 5 and 12. What is the hypotenuse?', ['7', '13', '15', '17'], 1, '25 + 144 = 169, and √169 = 13.'],
['In a right triangle, the side opposite angle A is 3 and the hypotenuse is 5. What is sin A?', ['3/5', '4/5', '3/4', '5/3'], 0, 'sin = opposite / hypotenuse = 3/5.'],
['If sin(x°) = 0.6, what is cos((90 − x)°)?', ['0.4', '0.6', '0.8', '1.6'], 1, 'sin(x°) = cos(90° − x°), so the value is the same: 0.6.']]),

T('Geometry & Trigonometry', 'Circles', `# Key idea
- Circumference 2πr. Area πr².
- Arc length = (central angle ÷ 360°) × 2πr, or r × θ with θ in radians.
- Sector area = (central angle ÷ 360°) × πr².
- 180° = π radians.
- Equation: (x − h)² + (y − k)² = r², center (h, k), radius r. Complete the square if needed.`, [
['What are the center and radius of (x − 2)² + (y + 1)² = 16?', ['Center (2, −1), radius 4', 'Center (−2, 1), radius 4', 'Center (2, −1), radius 16', 'Center (−2, 1), radius 16'], 0, 'h = 2, k = −1, and r² = 16 gives r = 4.'],
['A circle has radius 6. What is the length of an arc with a central angle of π/3 radians?', ['π', '2π', '3π', '6π'], 1, 'Arc length = rθ = 6 × π/3 = 2π.'],
['What is 90° in radians?', ['π/4', 'π/2', 'π', '2π'], 1, '90 × π/180 = π/2.']]),

/* ================= R&W: INFORMATION & IDEAS ================= */
T('Information & Ideas', 'Central ideas and details', `# Approach
- After reading, say the main idea in your own words before looking at the choices.
- Wrong choices are usually too broad, too narrow, or not stated in the text.
- For a detail question, find the exact sentence that answers it.`, [
['"Honeybees share the location of food through a waggle dance. The angle of the dance shows the direction relative to the sun, and the length of the waggle shows the distance." Which choice best states the main idea?', ['Honeybees prefer sunny days', 'The waggle dance tells other bees the direction and distance to food', 'Bees cannot find food on their own', 'Dancing helps bees stay warm'], 1, 'Both sentences explain what the dance communicates about food.'],
['According to the same text, what does the length of the waggle indicate?', ['Direction', 'Distance', 'Type of food', 'Time of day'], 1, 'The text says the length shows the distance.']]),

T('Information & Ideas', 'Command of evidence: text', `# Approach
- Find the exact claim in the question (often a hypothesis).
- The right answer directly supports, or weakens, that specific claim.
- A true but unrelated fact is wrong.`, [
['A researcher hypothesizes that city birds sing at a higher pitch than forest birds so they can be heard over traffic noise. Which finding would most directly support this?', ['City birds have brighter feathers', 'City birds sing higher-pitched songs near busy roads than in quiet parks', 'Forest birds eat more insects', 'Birds sing more in spring'], 1, 'It links higher pitch directly to noise.'],
['Claim: students who sleep more score better on memory tests. Which finding would most weaken this claim?', ['Students who slept 9 hours scored the same as those who slept 6 hours', 'Students who slept 9 hours scored highest', 'The tests were given in the morning', 'Most students sleep 7 hours'], 0, 'If more sleep made no difference, the claim is weakened.']]),

T('Information & Ideas', 'Command of evidence: data', `# Approach
- Read the title, labels and units first.
- The right answer must be accurate according to the data and relevant to the claim.
- Check you are reading the correct row, column or year.`, [
['Library visits: 2021: 12,000; 2022: 15,000; 2023: 18,000. Which choice uses the data to support the claim that visits rose every year?', ['Visits were 18,000 in 2023', 'Visits rose from 12,000 in 2021 to 15,000 in 2022 and then to 18,000 in 2023', 'Visits were highest in 2021', '2022 had fewer visits than 2021'], 1, 'Only this choice shows an increase each year.'],
['In the same light, Plant A grew 10 cm and Plant B grew 4 cm. Which statement is supported?', ['Plant B grew more than Plant A', 'Plant A grew more than twice as much as Plant B', 'Both plants grew equally', 'Plant A grew 4 cm'], 1, '10 is 2.5 times 4, which is more than twice.']]),

T('Information & Ideas', 'Inferences', `# Approach
- Pick the conclusion that must follow from the text, no more.
- The blank usually completes the logic of the last sentence: look for cause and effect.
- Reject choices that add new information the text does not support.`, [
['"Early telescopes produced blurry images because their lenses bent different colors of light by different amounts. Isaac Newton designed a telescope that used a mirror instead of a lens. Newton\'s design therefore ______." Which choice most logically completes the text?', ['was larger than earlier telescopes', 'avoided the color blurring caused by lenses', 'was never used by astronomers', 'required more light'], 1, 'The problem came from lenses; a mirror avoids it.'],
['"Most of the town\'s water comes from one reservoir. This summer, rainfall was half the usual amount, and the reservoir fell to its lowest level in decades. It is therefore likely that ______."', ['the town will build a new school', 'water use may need to be limited', 'rainfall will double next year', 'the reservoir is new'], 1, 'Low water supply logically leads to limits on use.']]),

/* ================= R&W: CRAFT & STRUCTURE ================= */
T('Craft & Structure', 'Words in context', `# Approach
- Cover the choices. Predict your own word from the sentence.
- Then pick the choice closest to your prediction.
- Watch for second meanings: "novel" can mean new, "check" can mean stop.`, [
['"The scientist\'s explanation was so lucid that even beginners understood it." As used here, "lucid" most nearly means', ['clear', 'lengthy', 'doubtful', 'technical'], 0, 'Beginners understood it, so it was clear.'],
['"Although the proposal seemed promising, the committee remained ______, asking for more evidence before approving it."', ['enthusiastic', 'skeptical', 'grateful', 'confused'], 1, '"Although" signals contrast, and asking for evidence shows doubt.']]),

T('Craft & Structure', 'Text structure and purpose', `# Approach
- Purpose: why did the author write this? To argue, explain, describe, compare, or challenge an idea.
- Structure: how do the parts relate? Problem then solution, claim then example, contrast.
- Function: what job does one sentence do in the text?`, [
['"Many people assume deserts are lifeless. In fact, the Sonoran Desert supports more than 2,000 plant species and hundreds of animal species." What is the main purpose of the text?', ['To describe the desert\'s climate', 'To challenge a common assumption with evidence', 'To explain how plants survive heat', 'To compare two deserts'], 1, 'It states an assumption, then counters it with facts.'],
['In the same text, what is the function of the second sentence?', ['It gives evidence against the assumption in the first sentence', 'It introduces an unrelated topic', 'It repeats the first sentence', 'It offers a personal opinion'], 0, '"In fact" introduces evidence that contradicts the assumption.']]),

T('Craft & Structure', 'Cross-text connections', `# Approach
- Write one line for each text: what is its position?
- Then ask: would the second author agree, disagree, or agree only in part?
- "Qualify" means accept with limits or conditions.`, [
['Text 1: "Homework improves learning at every grade level." Text 2: "Research shows homework helps high school students but has little effect for young children." How would the author of Text 2 most likely respond to Text 1?', ['By fully agreeing', 'By agreeing only in part, since the benefit depends on age', 'By arguing homework always harms learning', 'By saying no research exists'], 1, 'Text 2 limits the claim to older students.']]),

/* ================= R&W: EXPRESSION OF IDEAS ================= */
T('Expression of Ideas', 'Rhetorical synthesis', `# Approach
- These questions give notes and a goal, such as "emphasize a difference" or "introduce to an unfamiliar audience".
- Read the goal first. The right answer does exactly that goal, using the notes.
- A choice can be true and well written and still be wrong if it misses the goal.`, [
['Notes: Mount Everest is 8,849 m tall. K2 is 8,611 m tall. Goal: emphasize the difference in height. Which choice best accomplishes the goal?', ['Everest and K2 are both very tall mountains.', 'At 8,849 meters, Everest is about 238 meters taller than K2 (8,611 meters).', 'K2 is in the Karakoram range.', 'Everest is 8,849 meters tall.'], 1, 'Only this choice states the difference.'],
['Notes: Ada Lovelace (1815–1852) wrote what many consider the first computer program, for Charles Babbage\'s Analytical Engine. Goal: introduce Lovelace to an audience unfamiliar with her.', ['The program was written for the Analytical Engine.', 'Ada Lovelace (1815–1852) wrote what many consider the first computer program.', 'Babbage designed the Analytical Engine.', 'The program was written before 1852.'], 1, 'It names her and explains why she matters.']]),

T('Expression of Ideas', 'Transitions', `# Approach
Decide how the two sentences relate, then pick the matching word.
- Contrast: however, nevertheless, in contrast.
- Cause and effect: therefore, as a result, consequently.
- Addition: furthermore, moreover, in addition.
- Example: for example, for instance.
- Sequence: then, finally, subsequently.`, [
['"The museum expected 500 visitors on opening day. ______, more than 2,000 people came."', ['Therefore', 'However', 'For example', 'Similarly'], 1, 'The actual number contrasts with the expectation.'],
['"Solar panels have become much cheaper over the past decade. ______, many more homeowners have installed them."', ['As a result', 'Nevertheless', 'For instance', 'In contrast'], 0, 'Lower prices cause more installations.']]),

/* ================= R&W: STANDARD ENGLISH CONVENTIONS ================= */
T('Standard English Conventions', 'Boundaries: punctuation', `# Rules
- Two complete sentences need a period, a semicolon, or a comma plus and, but, or, so (FANBOYS).
- A comma alone between two complete sentences is a comma splice: wrong.
- A colon comes after a complete sentence and introduces a list or explanation.
- No comma between a subject and its verb.
- Extra (nonessential) information needs commas on both sides.`, [
['"The storm knocked out power across the ______ worked through the night to restore it." Which choice is correct?', ['city, crews', 'city; crews', 'city crews', 'city, crews,'], 1, 'Two complete sentences: a semicolon joins them. A comma alone is a splice.'],
['"My aunt, who lives in ______ visits us every summer."', ['Tripoli', 'Tripoli,', 'Tripoli;', 'Tripoli:'], 1, 'The nonessential clause opened with a comma, so it must close with one.'],
['Which sentence is punctuated correctly?', ['The lab needs three things: beakers, burners, and gloves.', 'The lab needs: three things beakers, burners, and gloves.', 'The lab needs three things; beakers, burners, and gloves.', 'The lab needs three things, beakers: burners and gloves.'], 0, 'A colon follows a complete sentence and introduces the list.']]),

T('Standard English Conventions', 'Form, structure and sense: grammar', `# Rules
- Subject–verb agreement: find the real subject and ignore phrases in between ("The list of items is").
- Pronouns: a singular noun like "company" takes "its", not "their".
- its = belonging to it; it's = it is.
- Keep verb tenses consistent unless the time changes.
- A modifier must sit next to what it describes.`, [
['"The list of items ______ on the table."', ['are', 'is', 'were', 'have been'], 1, 'The subject is "list" (singular), not "items".'],
['"The company updated ______ policy last week."', ["it's", 'its', 'their', "its'"], 1, '"Its" is the possessive for a singular noun.'],
['"Walking to school, ______."', ['a rainbow appeared in the sky', 'Lina saw a rainbow', 'the sky showed a rainbow', 'the rainbow was seen by Lina'], 1, 'The person walking (Lina) must come right after the modifier.']]),

/* ================= STRATEGY (free preview) ================= */
T('Test strategy', 'The Digital SAT format', `# How the test works
- Two sections: Reading and Writing, then Math.
- Reading and Writing: 2 modules of 27 questions, 32 minutes each.
- Math: 2 modules of 22 questions, 35 minutes each.
- The test is adaptive: how you do in Module 1 decides whether Module 2 is easier or harder.
- Scores: 200–800 per section, 400–1600 total.
- No penalty for wrong answers: answer every question.
- A graphing calculator (Desmos) and a reference sheet are built in for all of Math.
# Tip
Check the College Board website for the latest official details before test day.`, [
['Is there a penalty for wrong answers on the Digital SAT?', ['Yes, a quarter point', 'Yes, a full point', 'No, so answer every question', 'Only in Math'], 2, 'Unanswered and wrong answers both score zero, so always answer.'],
['What decides the difficulty of Module 2 in a section?', ['Your previous SAT score', 'Your performance in Module 1 of that section', 'Your grade in school', 'It is random'], 1, 'The test adapts to your Module 1 performance.']],
{ free: true, resources: [['Bluebook (official College Board testing app)', 'https://bluebook.collegeboard.org/', 'Download it and take the official full-length practice tests.'], ['Khan Academy Digital SAT', 'https://www.khanacademy.org/test-prep/digital-sat', 'Free official practice by skill.']] }),

T('Test strategy', 'Using the Desmos calculator', `# Fast uses
- Equations: type both sides as y = left and y = right; the x-values of the intersections are the solutions.
- Systems: graph both equations and tap the intersection.
- Quadratics: graph and tap the vertex and the x-intercepts.
- Unknown constants: type the equation with a letter and add a slider to test values.
- Tables and regression: enter data and type y₁ ~ mx₁ + b to get a line of best fit.`, [
['To solve 2x + 3 = x² − 1 quickly in Desmos, what should you do?', ['Graph y = 2x + 3 and y = x² − 1 and find where they intersect', 'Graph only y = 2x + 3', 'Type the numbers into a table', 'Desmos cannot solve equations'], 0, 'The x-values of the intersections are the solutions.']],
{ free: true, resources: [['Desmos graphing calculator', 'https://www.desmos.com/calculator', 'Practise with the same calculator used on the test.']] }),

T('Test strategy', 'Timing and guessing', `# Pace
- Reading and Writing: about 71 seconds per question (32 minutes ÷ 27).
- Math: about 95 seconds per question (35 minutes ÷ 22).
# Habits
- If a question takes too long, guess, flag it, and move on.
- Return to flagged questions at the end of the module.
- Never leave a question blank.`, [
['About how much time do you have per Math question?', ['About 45 seconds', 'About 71 seconds', 'About 95 seconds', 'About 3 minutes'], 2, '35 minutes = 2,100 seconds; 2,100 ÷ 22 ≈ 95 seconds.']],
{ free: true })
];
})();
