---
updatedAt: 2025-05-13T06:27:06.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Standard Authorization Overview

Learn why you should choose Standard Authorization and how it works.

Authorization is the process where merchants request approval from Reap to proceed with transactions. In Standard Authorization mode, **Reap** acts as the authoritative source for card balances, evaluating each card's `availableCredit` to determine whether to approve or decline incoming authorization requests.

# Standard Authorization: A Comprehensive Guide

Once you’ve chosen your authorization model, you can start building your card program. The following three guides will walk you through the key concepts required to successfully implement a card program with standard authorization:

<Cards columns={3}>
  <Card title="Setup Guide" href="https://reap.readme.io/docs/standard-authorizationcard-program-setup#card-program-setup-standard-authorization">
    Suggested steps to build your card program with key configurations and setup requirements.
  </Card>

  <Card title="Authorization Flow" href="https://reap.readme.io/docs/standard-authorization-authorization-flow#authorization-flow">
    An illustrated example of an authorization request and approval flow in a card program with Standard Authorization.
  </Card>

  <Card title="Card Program Fund Flow" href="https://reap.readme.io/docs/standard-authorization-fund-flow-scenarios#card-program-fund-flow-an-overview">
    An illustration of the relationship between card balance adjustments and the card program’s master account balance when transactions are processed.
  </Card>
</Cards>

# Advantages of Standard Authorization

* Simplified technical setup with fewer complexities.
* No need to respond to authorization requests within seconds.
* Reap manages card balances, reducing operational overhead.
* Reliable and streamlined implementation.

# Understanding Standard Authorization in 3 Minutes

<Embed typeOfEmbed="youtube" url="https://www.youtube.com/watch?v=kCzExwyJ0GY" html="%3Ciframe%20class%3D%22embedly-embed%22%20src%3D%22%2F%2Fcdn.embedly.com%2Fwidgets%2Fmedia.html%3Fsrc%3Dhttps%253A%252F%252Fwww.youtube.com%252Fembed%252FkCzExwyJ0GY%253Ffeature%253Doembed%26display_name%3DYouTube%26url%3Dhttps%253A%252F%252Fwww.youtube.com%252Fwatch%253Fv%253DkCzExwyJ0GY%26image%3Dhttps%253A%252F%252Fi.ytimg.com%252Fvi%252FkCzExwyJ0GY%252Fhqdefault.jpg%26type%3Dtext%252Fhtml%26schema%3Dyoutube%22%20width%3D%22854%22%20height%3D%22480%22%20scrolling%3D%22no%22%20title%3D%22YouTube%20embed%22%20frameborder%3D%220%22%20allow%3D%22autoplay%3B%20fullscreen%3B%20encrypted-media%3B%20picture-in-picture%3B%22%20allowfullscreen%3D%22true%22%3E%3C%2Fiframe%3E" href="https://www.youtube.com/watch?v=kCzExwyJ0GY" providerUrl="https://www.youtube.com/" providerName="YouTube" />

***

**Related Materials**:

📖 Guide/ [Standard Authorization: Card Program Setup](https://reap.readme.io/docs/standard-authorizationcard-program-setup#/)

📖 Guide/ [Standard Authorization: Authorization Flow](https://reap.readme.io/docs/standard-authorization-authorization-flow#/)

📖 Guide/ [Standard Authorization: Fund Flow Scenarios](https://reap.readme.io/docs/standard-authorization-fund-flow-scenarios#/)