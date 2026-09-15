---
title: "What I did before I ran a single ad"
description: "We acquired ₦100,000 customers for about ₦7,700 each. The landing page and the setup work behind that number are the part nobody talks about."
date: 2026-09-15
category: "Marketing & Ads"
author: "Levi Henry"
tags: ["Meta Ads", "Tracking", "Paid Acquisition"]
seoTitle: "Meta ads tracking setup: what to fix before you spend more"
seoDescription: "A Meta campaign that sold 64 seats at ₦100,000 each, at ₦7,702 per sale. The tracking setup behind it, and five things to check on your own ad account."
featured: true
draft: false
---

Last week a client sent me a screenshot. Her brand had landed at number four on a creator leaderboard, sitting alongside names with far bigger audiences than hers. Her message said none of it would have been possible without me.

Getting onto that board was the goal she set at the start. It ranks the platform's top-performing creators for the week, so the only route onto it is selling more than almost everyone else selling that week. It was a real target with a real number behind it.

I appreciated the message. I also want to be honest about what actually happened, because the version people assume is wrong.

They assume I wrote better ads. The ads were the last thing we did and they took the least time. What made the difference was three weeks of unglamorous setup work that most people skip, plus a landing page that did the actual selling. Those two things are what I end up building for almost every small business that tells me their ads don't work.

## The situation

She teaches pattern making. Real skill, real course, twelve weeks, a cohort that had already run four times. The product was not the problem. She was selling through a hosted platform on its free plan, which handled checkout fine and did exactly what it promised.

The problem showed up the moment we tried to advertise. Meta wants you to verify the domain where your conversions happen. The free plan didn't support connecting a custom domain, so there was no domain to verify. Without verification, we couldn't reliably optimize for purchases. And without optimizing for purchases, you are paying Meta to find you clicks instead of customers, which is how people burn a budget and conclude that ads don't work for their business.

This is the part nobody writes a post about. It's plumbing.

## The page had to do the selling

She had bought a domain a month earlier and never pointed it anywhere. We used it.

I built a standalone landing page for the bootcamp and deployed it on a subdomain of her own domain. Domain verification was the technical reason. The commercial reason was bigger: a checkout page is a form, and a form cannot sell a twelve-week program to someone who has never heard of you.

So I wrote the page as the entire pitch. Think about what that page has to accomplish. Someone sees a video on Instagram, taps a link, and arrives knowing nothing about her, the program, or whether any of it works. By the bottom of one scroll they have to understand what they will be able to do at the end of twelve weeks, believe she is the person to teach it, and accept a ₦100,000 price. No sales call. No demo. No email sequence to warm them up. One page, one read, one decision.

That's the piece of this that people underestimate. The ads bought attention, which is the easy part and the part you can pay for. Turning that attention into a ₦100,000 purchase was the page's job, and the page is where I spent the most time.

Then I put the Meta Pixel on it, which gave us a domain we controlled, which meant we could verify it with Meta through a DNS record, which meant we could finally optimize the campaign for purchases.

Then we tested the whole path with a real payment. Landing page, checkout, purchase event firing in Events Manager. We watched every step work with real money moving through it before we trusted any of it.

Only after that did we build the campaign. One sales campaign, one broad audience, Nigeria, three video variants so the creative had something to compete against itself with. Daily budget of ₦10,000, which is roughly what a decent lunch costs in a lot of the world and is a genuinely small amount of money to test with.

## The first 24 hours

220 link clicks. Zero sales.

This is the point where most people kill a campaign. Money is going out, nothing is coming back, and the obvious conclusion is that ads don't work for this product. We left it running, because the tracking was clean enough to show me that people were landing on the page and moving through it the way they should. The traffic was behaving. It just hadn't bought yet.

The first sales came in after that first day. Once they did, I raised the budget, and kept raising it as the numbers held. It finished at ₦80,000 a day.

Here is the honest footnote: the tracking still isn't perfect. The platform's purchase event fires with the wrong value more often than it should, so the numbers Meta reports and the numbers in her account don't line up. I know this because we checked the real sales against the reported ones. Most people never check, which means most people are optimizing against numbers they've never verified.

## Where it ended

The campaign ran about a month, from the middle of August to the middle of September, and we shut it off once the cohort filled.

- ₦492,963 spent
- 4.5 million impressions, 3.7 million people reached
- 34,549 link clicks
- 64 purchases, at ₦7,702 per purchase

The bootcamp sells at ₦100,000 a seat. So we were acquiring ₦100,000 customers for roughly ₦7,700 each, which is the only number in that list that really matters. Everything else is a step on the way to it. The campaign returned more than ten times what it cost.

The cohort took 100 registrations in total. The ads drove 64 of them. The rest came from her own audience and word of mouth, and I'd rather say that plainly, because plenty of ad case studies quietly count the organic sales too.

## What I'd change

The ceiling on this campaign was the platform.

Her course sells through a hosted product, and on that kind of setup you get to connect a pixel and very little else. You inherit whatever events the platform fires, formatted however it chooses to format them. When the values come through wrong, there is nothing on your side to fix. You report it and you wait. That is the entire remedy available to you.

Clean conversion data is fuel for the algorithm. Feed it accurate purchase values and it gets better at finding buyers every day it runs. We were feeding it something closer to a smudge, and it still produced what it produced, which tells you how much was sitting on the table.

If she runs this again, I'd move the checkout onto infrastructure she controls, where the purchase event fires with the right value every time. I'd expect the same spend to go further.

## The part you can use

If your ads aren't producing, run through these five before you touch your creative or your targeting.

1. Do you own the domain your conversions happen on? Check whose name it's actually registered in. If your checkout lives on someone else's subdomain, you are building on rented land and you will hit a wall the moment you try to scale spend.

2. Is that domain verified with the ad platform? Verification is a DNS record and twenty minutes. Skipping it caps what the algorithm can do for you.

3. Is your pixel firing on the pages that matter, and have you tested it with a real transaction? Test mode is not proof. Put a real payment through and watch the event land.

4. Do the platform's reported conversions match what actually hit your account? Check this monthly. When the two disagree, your bank statement is the one telling the truth.

5. Are you optimizing for a purchase, or for a click? These produce completely different campaigns. Most underperforming accounts I look at are optimizing for whatever was easiest to set up, and clicks are always easiest.

## Why this matters more than the creative

Good creative on broken infrastructure produces expensive noise. The algorithm is a feedback machine. Feed it clean signals about who bought and it will go find more people like them. Feed it nothing, or feed it noise, and it will do exactly what you told it to do, which is find you cheap clicks from people who were never going to buy.

She wanted the leaderboard. She got the leaderboard. What put her there was a landing page written to carry a ₦100,000 decision on its own, a DNS record, and one real test payment.

That's usually where the answer is.

> If your ads are running and you can't tell what they're producing, start with the tracking. It's more fixable than most people expect. [Book a call](https://thelevihenry.com/contact) and we'll go through your setup together.
