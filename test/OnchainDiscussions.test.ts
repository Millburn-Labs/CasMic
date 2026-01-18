import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";

describe("OnchainDiscussions", function () {
  async function deployDiscussionsFixture() {
    const [owner, manager, user1, user2, user3] = await hre.ethers.getSigners();

    const OnchainDiscussions = await hre.ethers.getContractFactory("OnchainDiscussions");
    const discussions = await OnchainDiscussions.deploy();

    return { discussions, owner, manager, user1, user2, user3 };
  }

  describe("Discussion Creation", function () {
    it("Should create a standalone discussion", async function () {
      const { discussions, user1 } = await loadFixture(deployDiscussionsFixture);

      await expect(discussions.connect(user1).createDiscussion(0, "Test Discussion", "This is a test"))
        .to.emit(discussions, "DiscussionCreated")
        .withArgs(1, 0, user1.address, "Test Discussion");

      const [discussion] = await discussions.getDiscussion(1);
      expect(discussion.title).to.equal("Test Discussion");
      expect(discussion.creator).to.equal(user1.address);
      expect(discussion.proposalId).to.equal(0);
      expect(discussion.isActive).to.be.true;
    });

    it("Should create a discussion linked to a proposal", async function () {
      const { discussions, user1 } = await loadFixture(deployDiscussionsFixture);

      await discussions.connect(user1).createDiscussion(5, "Proposal Discussion", "Discussion for proposal 5");

      const [discussion] = await discussions.getDiscussion(1);
      expect(discussion.proposalId).to.equal(5);
    });
  });

  describe("Discussion Updates", function () {
    it("Should allow creator to update discussion", async function () {
      const { discussions, user1 } = await loadFixture(deployDiscussionsFixture);

      await discussions.connect(user1).createDiscussion(0, "Test", "Original content");

      await expect(discussions.connect(user1).updateDiscussion(1, "Updated content"))
        .to.emit(discussions, "DiscussionUpdated")
        .withArgs(1, "Updated content");

      const [discussion] = await discussions.getDiscussion(1);
      expect(discussion.content).to.equal("Updated content");
    });

    it("Should not allow non-creator to update discussion", async function () {
      const { discussions, user1, user2 } = await loadFixture(deployDiscussionsFixture);

      await discussions.connect(user1).createDiscussion(0, "Test", "Original content");

      await expect(discussions.connect(user2).updateDiscussion(1, "Hacked content"))
        .to.be.revertedWith("Not authorized");
    });
  });

  describe("Comments", function () {
    it("Should allow users to add top-level comments", async function () {
      const { discussions, user1, user2 } = await loadFixture(deployDiscussionsFixture);

      await discussions.connect(user1).createDiscussion(0, "Test Discussion", "Content");

      await expect(discussions.connect(user2).addComment(1, "Great idea!", 0))
        .to.emit(discussions, "CommentAdded")
        .withArgs(1, 1, user2.address, 0);

      const [comment] = await discussions.getComment(1);
      expect(comment.content).to.equal("Great idea!");
      expect(comment.parentCommentId).to.equal(0);
    });

    it("Should allow users to add nested comments", async function () {
      const { discussions, user1, user2, user3 } = await loadFixture(deployDiscussionsFixture);

      await discussions.connect(user1).createDiscussion(0, "Test Discussion", "Content");
      await discussions.connect(user2).addComment(1, "Parent comment", 0);

      await discussions.connect(user3).addComment(1, "Reply to parent", 1);

      const [comment] = await discussions.getComment(2);
      expect(comment.parentCommentId).to.equal(1);

      const [, replyIds] = await discussions.getComment(1);
      expect(replyIds).to.include(2n); // BigInt comparison
    });

    it("Should not allow commenting on non-existent discussion", async function () {
      const { discussions, user1 } = await loadFixture(deployDiscussionsFixture);

      await expect(discussions.connect(user1).addComment(999, "Comment", 0))
        .to.be.revertedWith("Discussion does not exist or is inactive");
    });
  });

  describe("Voting on Comments", function () {
    it("Should allow users to upvote comments", async function () {
      const { discussions, user1, user2 } = await loadFixture(deployDiscussionsFixture);

      await discussions.connect(user1).createDiscussion(0, "Test", "Content");
      await discussions.connect(user2).addComment(1, "Comment", 0);

      await expect(discussions.connect(user1).upvoteComment(1))
        .to.emit(discussions, "CommentUpvoted")
        .withArgs(1, user1.address);

      const [comment] = await discussions.getComment(1);
      expect(comment.upvotes).to.equal(1);
    });

    it("Should allow users to downvote comments", async function () {
      const { discussions, user1, user2 } = await loadFixture(deployDiscussionsFixture);

      await discussions.connect(user1).createDiscussion(0, "Test", "Content");
      await discussions.connect(user2).addComment(1, "Comment", 0);

      await expect(discussions.connect(user1).downvoteComment(1))
        .to.emit(discussions, "CommentDownvoted")
        .withArgs(1, user1.address);

      const [comment] = await discussions.getComment(1);
      expect(comment.downvotes).to.equal(1);
    });

    it("Should prevent double upvoting", async function () {
      const { discussions, user1, user2 } = await loadFixture(deployDiscussionsFixture);

      await discussions.connect(user1).createDiscussion(0, "Test", "Content");
      await discussions.connect(user2).addComment(1, "Comment", 0);

      await discussions.connect(user1).upvoteComment(1);

      await expect(discussions.connect(user1).upvoteComment(1))
        .to.be.revertedWith("Already upvoted");
    });

    it("Should switch from downvote to upvote", async function () {
      const { discussions, user1, user2 } = await loadFixture(deployDiscussionsFixture);

      await discussions.connect(user1).createDiscussion(0, "Test", "Content");
      await discussions.connect(user2).addComment(1, "Comment", 0);

      await discussions.connect(user1).downvoteComment(1);
      await discussions.connect(user1).upvoteComment(1);

      const [comment] = await discussions.getComment(1);
      expect(comment.downvotes).to.equal(0);
      expect(comment.upvotes).to.equal(1);
    });
  });

  describe("Discussion Queries", function () {
    it("Should return all comments for a discussion", async function () {
      const { discussions, user1, user2 } = await loadFixture(deployDiscussionsFixture);

      await discussions.connect(user1).createDiscussion(0, "Test", "Content");
      await discussions.connect(user2).addComment(1, "Comment 1", 0);
      await discussions.connect(user2).addComment(1, "Comment 2", 0);

      const [, commentIds] = await discussions.getDiscussion(1);
      expect(commentIds).to.have.lengthOf(2);
      expect(commentIds[0]).to.equal(1);
      expect(commentIds[1]).to.equal(2);
    });

    it("Should return discussions linked to a proposal", async function () {
      const { discussions, user1 } = await loadFixture(deployDiscussionsFixture);

      await discussions.connect(user1).createDiscussion(5, "Discussion 1", "Content");
      await discussions.connect(user1).createDiscussion(5, "Discussion 2", "Content");
      await discussions.connect(user1).createDiscussion(3, "Discussion 3", "Content"); // Different proposal

      const proposalDiscussions = await discussions.getProposalDiscussions(5);
      expect(proposalDiscussions).to.have.lengthOf(2);
      expect(proposalDiscussions[0]).to.equal(1);
      expect(proposalDiscussions[1]).to.equal(2);
    });
  });
});
