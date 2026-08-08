import assert from "node:assert/strict";
import {
  FREE_CAMPAIGN_PREVIEW_LIMIT,
  freeCampaignPreviewAvailable,
} from "./feature-gates";

assert.equal(FREE_CAMPAIGN_PREVIEW_LIMIT, 1);
assert.equal(freeCampaignPreviewAvailable({ by_kind: {} }), true);
assert.equal(freeCampaignPreviewAvailable({ by_kind: { campaign: 0 } }), true);
assert.equal(freeCampaignPreviewAvailable({ by_kind: { campaign: 1 } }), false);
assert.equal(freeCampaignPreviewAvailable({ by_kind: { campaign: 5 } }), false);

console.log("free campaign preview gate: ok");
