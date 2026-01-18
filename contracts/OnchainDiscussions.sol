// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OnchainDiscussions
 * @dev Fully decentralized onchain governance debates and discussions
 */
contract OnchainDiscussions is AccessControl {
    bytes32 public constant DISCUSSION_MANAGER_ROLE = keccak256("DISCUSSION_MANAGER_ROLE");

    struct Discussion {
        uint256 discussionId;
        uint256 proposalId; // Linked proposal (0 if standalone discussion)
        address creator;
        string title;
        string content;
        uint256 createdAt;
        uint256 lastUpdated;
        bool isActive;
    }

    struct Comment {
        uint256 commentId;
        uint256 discussionId;
        address author;
        string content;
        uint256 parentCommentId; // 0 if top-level comment
        uint256 createdAt;
        uint256 upvotes;
        uint256 downvotes;
        bool isDeleted;
    }

    mapping(uint256 => Discussion) public discussions;
    mapping(uint256 => Comment) public comments;
    mapping(uint256 => uint256[]) public discussionComments; // discussionId => commentIds[]
    mapping(uint256 => uint256[]) public commentReplies; // commentId => reply commentIds[]
    mapping(uint256 => mapping(address => bool)) public commentUpvotes; // commentId => user => has upvoted
    mapping(uint256 => mapping(address => bool)) public commentDownvotes; // commentId => user => has downvoted

    uint256 public discussionCounter;
    uint256 public commentCounter;

    event DiscussionCreated(
        uint256 indexed discussionId,
        uint256 indexed proposalId,
        address indexed creator,
        string title
    );
    event DiscussionUpdated(uint256 indexed discussionId, string newContent);
    event CommentAdded(
        uint256 indexed commentId,
        uint256 indexed discussionId,
        address indexed author,
        uint256 parentCommentId
    );
    event CommentUpvoted(uint256 indexed commentId, address indexed voter);
    event CommentDownvoted(uint256 indexed commentId, address indexed voter);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISCUSSION_MANAGER_ROLE, msg.sender);
    }

    /**
     * @dev Create a new discussion
     * @param proposalId Linked proposal ID (0 for standalone discussion)
     * @param title Discussion title
     * @param content Discussion content
     * @return discussionId The created discussion ID
     */
    function createDiscussion(
        uint256 proposalId,
        string memory title,
        string memory content
    ) external returns (uint256 discussionId) {
        discussionCounter++;
        discussionId = discussionCounter;

        Discussion memory newDiscussion = Discussion({
            discussionId: discussionId,
            proposalId: proposalId,
            creator: msg.sender,
            title: title,
            content: content,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp,
            isActive: true
        });

        discussions[discussionId] = newDiscussion;

        emit DiscussionCreated(discussionId, proposalId, msg.sender, title);
        return discussionId;
    }

    /**
     * @dev Update discussion content
     * @param discussionId The discussion ID
     * @param newContent New discussion content
     */
    function updateDiscussion(uint256 discussionId, string memory newContent) external {
        Discussion storage discussion = discussions[discussionId];
        require(discussion.isActive, "Discussion does not exist or is inactive");
        require(discussion.creator == msg.sender || hasRole(DISCUSSION_MANAGER_ROLE, msg.sender), "Not authorized");

        discussion.content = newContent;
        discussion.lastUpdated = block.timestamp;

        emit DiscussionUpdated(discussionId, newContent);
    }

    /**
     * @dev Add a comment to a discussion
     * @param discussionId The discussion ID
     * @param content Comment content
     * @param parentCommentId Parent comment ID (0 for top-level comment)
     * @return commentId The created comment ID
     */
    function addComment(
        uint256 discussionId,
        string memory content,
        uint256 parentCommentId
    ) external returns (uint256 commentId) {
        require(discussions[discussionId].isActive, "Discussion does not exist or is inactive");

        commentCounter++;
        commentId = commentCounter;

        Comment memory newComment = Comment({
            commentId: commentId,
            discussionId: discussionId,
            author: msg.sender,
            content: content,
            parentCommentId: parentCommentId,
            createdAt: block.timestamp,
            upvotes: 0,
            downvotes: 0,
            isDeleted: false
        });

        comments[commentId] = newComment;
        discussionComments[discussionId].push(commentId);

        if (parentCommentId > 0) {
            require(comments[parentCommentId].discussionId == discussionId, "Invalid parent comment");
            commentReplies[parentCommentId].push(commentId);
        }

        emit CommentAdded(commentId, discussionId, msg.sender, parentCommentId);
        return commentId;
    }

    /**
     * @dev Upvote a comment
     * @param commentId The comment ID
     */
    function upvoteComment(uint256 commentId) external {
        Comment storage comment = comments[commentId];
        require(!comment.isDeleted, "Comment is deleted");
        require(!commentUpvotes[commentId][msg.sender], "Already upvoted");

        if (commentDownvotes[commentId][msg.sender]) {
            comment.downvotes--;
            commentDownvotes[commentId][msg.sender] = false;
        }

        comment.upvotes++;
        commentUpvotes[commentId][msg.sender] = true;

        emit CommentUpvoted(commentId, msg.sender);
    }

    /**
     * @dev Downvote a comment
     * @param commentId The comment ID
     */
    function downvoteComment(uint256 commentId) external {
        Comment storage comment = comments[commentId];
        require(!comment.isDeleted, "Comment is deleted");
        require(!commentDownvotes[commentId][msg.sender], "Already downvoted");

        if (commentUpvotes[commentId][msg.sender]) {
            comment.upvotes--;
            commentUpvotes[commentId][msg.sender] = false;
        }

        comment.downvotes++;
        commentDownvotes[commentId][msg.sender] = true;

        emit CommentDownvoted(commentId, msg.sender);
    }

    /**
     * @dev Get discussion with comments
     * @param discussionId The discussion ID
     * @return discussion Discussion structure
     * @return commentIds Array of comment IDs
     */
    function getDiscussion(uint256 discussionId)
        external
        view
        returns (Discussion memory discussion, uint256[] memory commentIds)
    {
        discussion = discussions[discussionId];
        commentIds = discussionComments[discussionId];
        return (discussion, commentIds);
    }

    /**
     * @dev Get comment with replies
     * @param commentId The comment ID
     * @return comment Comment structure
     * @return replyIds Array of reply comment IDs
     */
    function getComment(uint256 commentId)
        external
        view
        returns (Comment memory comment, uint256[] memory replyIds)
    {
        comment = comments[commentId];
        replyIds = commentReplies[commentId];
        return (comment, replyIds);
    }

    /**
     * @dev Get discussions linked to a proposal
     * @param proposalId The proposal ID
     * @return discussionIds Array of discussion IDs
     */
    function getProposalDiscussions(uint256 proposalId)
        external
        view
        returns (uint256[] memory discussionIds)
    {
        uint256 count = 0;
        // First pass: count discussions
        for (uint256 i = 1; i <= discussionCounter; i++) {
            if (discussions[i].proposalId == proposalId && discussions[i].isActive) {
                count++;
            }
        }

        // Second pass: collect discussion IDs
        discussionIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= discussionCounter; i++) {
            if (discussions[i].proposalId == proposalId && discussions[i].isActive) {
                discussionIds[index] = i;
                index++;
            }
        }

        return discussionIds;
    }
}
