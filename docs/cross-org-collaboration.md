# Cross-Org Collaboration & Billing Model

## How Cross-Organization Invites Work

### The Model
When **Org A** (artist/tour company) invites a promoter from **Org B** to collaborate on a show:

1. **The collaborator rides on Org A's subscription** - they don't need their own paid plan
2. **Org A's collaborator limit is consumed** - the invited promoter counts against Org A's plan
3. **Viral distribution** - promoters can use Oncore without subscribing, encouraging adoption
4. **Clear billing boundaries** - only the inviting org pays, no confusion about who's responsible

### Examples

#### Scenario 1: Tour Manager Invites Promoter
- **MyBand Tours** (Team Manager plan: 50 collaborators) invites **promoter@venue.com**
- Promoter gets access to the specific show's advancing session
- Promoter can view/edit advancing fields, upload documents (based on their role)
- Promoter does NOT get access to MyBand Tours' other shows or internal data
- MyBand Tours now has 49 remaining collaborator slots

#### Scenario 2: Promoter Already Has Their Own Org
- **BigPromoter LLC** has their own Oncore org with Solo Artist plan
- **IndieArtist Tours** invites someone from BigPromoter LLC to collaborate
- The collaboration uses IndieArtist Tours' plan limits (not BigPromoter's)
- The person can switch between organizations in their account

#### Scenario 3: Limit Exceeded
- **SmallTour Co** (Solo Artist plan: 10 collaborators) tries to invite an 11th collaborator
- System blocks the invite with upgrade prompt
- Message: "Collaborator limit reached (10 of 10 used). Upgrade your Solo Artist plan to invite more collaborators."

### UI Clarifications

When inviting collaborators, the UI shows:
- **Clear plan context**: "You have 15 of 50 collaborator slots available on your Team Manager plan"
- **Cost transparency**: "Collaborators use your plan - they don't need to pay"
- **Upgrade prompts**: When limits are reached, clear upgrade path with plan comparison

### FAQ for Users

**Q: If I invite a promoter, do they need to pay?**
A: No! Collaborators use your organization's plan. Only you pay for the subscription.

**Q: What happens if the promoter already has their own Oncore account?**
A: They can use the same login for both organizations. They'll see both in their account switcher.

**Q: Can I see how many collaborator slots I'm using?**
A: Yes! Check your billing page or the invite dialog for current usage: "5 of 20 collaborator slots used"

**Q: What if I hit my collaborator limit?**
A: You'll need to upgrade your plan to invite more people. We'll show you upgrade options when you hit the limit.

**Q: Can collaborators invite other people?**
A: No - only your org members (owner/admin/editor roles) can send invites. Collaborators are scoped to specific shows.

### Benefits of This Model

1. **Lower barrier to adoption** - promoters don't need to evaluate/purchase to try Oncore
2. **Predictable billing** - tour companies know exactly what they're paying for
3. **Natural growth** - satisfied collaborators become customers for their own tours
4. **Clean permissions** - collaborators only see what they need for their specific shows
5. **Audit trail** - all activity is logged under the paying organization

### Technical Implementation

- Collaborators are stored in `show_collaborators` table with `org_id` pointing to the inviting org
- Seat counting includes collaborators in the inviting org's usage
- RLS policies ensure collaborators only access their assigned shows
- Billing limits are enforced at invite-time and through database constraints
- Activity logging tracks all collaborator actions under the inviting org