const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let currentColor = '#000000';
        let currentLineWidth = 5;
        let currentUser = null;
        let currentWorkId = null;
        let sortType = 'time';
        let currentTopic = null;
        let hintLeft = 3;
        let currentRole = ''; // 记录当前角色：creator/guesser
        const USER_KEY = 'cp_community_users_v2';
        const WORK_KEY = 'cp_community_works_v2';
        const COMMENT_KEY = 'cp_community_comments_v2';
        const TOPIC_KEY = 'cp_community_topics';
        const RECORD_KEY = 'cp_community_records';

        function initCanvas() {
            const wrap = document.querySelector('.canvas-wrap');
            canvas.width = wrap.offsetWidth;
            canvas.height = wrap.offsetHeight;
            ctx.lineCap = 'round';
            ctx.lineWidth = currentLineWidth;
            canvas.addEventListener('mousedown', (e) => {
                if (!currentUser || currentRole !== 'creator') return; // 答题者不能绘画
                isDrawing = true;
                const pos = getPos(e);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
            });
            canvas.addEventListener('mousemove', (e) => {
                if (!isDrawing || !currentUser || currentRole !== 'creator') return;
                const pos = getPos(e);
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentLineWidth;
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            });
            canvas.addEventListener('mouseup', () => isDrawing = false);
            canvas.addEventListener('mouseleave', () => isDrawing = false);
            canvas.addEventListener('touchstart', (e) => {
                if (!currentUser || currentRole !== 'creator') return;
                e.preventDefault();
                isDrawing = true;
                const pos = getPos(e);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
            });
            canvas.addEventListener('touchmove', (e) => {
                if (!isDrawing || !currentUser || currentRole !== 'creator') return;
                e.preventDefault();
                const pos = getPos(e);
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentLineWidth;
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            });
            canvas.addEventListener('touchend', () => isDrawing = false);
        }

        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
                y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
            };
        }
        function setColor(color) { currentColor = color; }
        function setLineWidth(width) { currentLineWidth = width; ctx.lineWidth = width; }
        function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

        function register() {
            const username = document.getElementById('username').value.trim();
            if (!username) return alert('请输入用户名');
            const users = JSON.parse(localStorage.getItem(USER_KEY) || '[]');
            if (users.some(user => user.id === username)) {
                return alert('啊哦 这个名字有人用了www！一个ID只能注册一次，换一个id吧~');
            }
            users.push({ id: username, registerTime: new Date().toLocaleString() });
            localStorage.setItem(USER_KEY, JSON.stringify(users));
            alert(`欢迎来到康柏小窝！你的唯一ID是：${username}，请牢记～`);
        }

        function login() {
            const username = document.getElementById('username').value.trim();
            if (!username) return alert('请输入用户名');
            const users = JSON.parse(localStorage.getItem(USER_KEY) || '[]');
            if (!users.some(user => user.id === username)) {
                return alert('还没注册哟宝贝');
            }
            currentUser = username;
            document.getElementById('authPanel').style.display = 'none';
            document.getElementById('userInfo').style.display = 'block';
            document.getElementById('userInfo').innerHTML = `当前登录：<b>${currentUser}</b>（唯一ID） | <a href="javascript:logout()" style="color:#085c3f">退出登录</a>`;
            document.getElementById('roleSelectPanel').style.display = 'block'; // 显示角色选择
            loadAllTopics();
            loadCommunityWorks();
            loadUserRecords();
        }

        function logout() {
            currentUser = null;
            currentRole = '';
            currentWorkId = null;
            currentTopic = null;
            hintLeft = 3;
            document.getElementById('authPanel').style.display = 'flex';
            document.getElementById('userInfo').style.display = 'none';
            document.getElementById('roleSelectPanel').style.display = 'none';
            document.getElementById('creatorPanel').style.display = 'none';
            document.getElementById('guesserPanel').style.display = 'none';
            document.getElementById('guessResult').textContent = '';
            document.getElementById('publishTip').style.display = 'block';
            document.getElementById('recordPanel').style.display = 'none';
            document.getElementById('guessQuestion').innerText = '猜梗挑战：请先选择一个题目作答';
            document.getElementById('hintCount').innerText = '3';
            document.getElementById('hintBtn').style.display = 'none';
            const disableBtns = document.querySelectorAll('#workCategory, #workDesc, #publishBtn, .btn, .guess-input, #guessBtn, #modalCommentInput, #modalSendBtn');
            disableBtns.forEach(btn => btn.disabled = true);
            document.querySelectorAll('.comment-btn').forEach(btn => {
                btn.style.opacity = '0.6';
                btn.style.pointerEvents = 'none';
            });
            clearCanvas();
        }

        // 新增角色选择函数
        function chooseRole(role) {
            currentRole = role;
            document.getElementById('roleSelectPanel').style.display = 'none';
            document.getElementById('recordPanel').style.display = 'block';

            if (role === 'creator') {
                // 出题者：显示出题面板，启用绘画工具
                document.getElementById('creatorPanel').style.display = 'block';
                document.getElementById('guessSetArea').style.display = 'block';
                const toolBtns = document.querySelectorAll('.tool-bar .btn');
                toolBtns.forEach(btn => btn.disabled = false);
            } else if (role === 'guesser') {
                // 答题者：显示答题面板，隐藏题目内容，禁用绘画工具
                document.getElementById('guesserPanel').style.display = 'block';
                document.querySelectorAll('.topic-content').forEach(el => el.classList.add('guesser-hide'));
                document.querySelectorAll('.tool-bar .btn').forEach(btn => btn.disabled = true);
                document.getElementById('guessInput').disabled = false;
                document.getElementById('guessBtn').disabled = false;
                // 答题者默认选择第一个题目（仅加载画板，看不到题目内容）
                const topics = JSON.parse(localStorage.getItem(TOPIC_KEY) || '[]');
                if (topics.length > 0) {
                    selectTopic(topics[0].id);
                }
            }
        }

        function saveRecord(isCorrect) {
            if (!currentUser || !currentTopic) return;
            const record = {
                userId: currentUser,
                topicId: currentTopic.id,
                topicContent: currentTopic.content,
                isCorrect: isCorrect,
                answerTime: new Date().toLocaleString()
            };
            const records = JSON.parse(localStorage.getItem(RECORD_KEY) || '[]');
            records.push(record);
            localStorage.setItem(RECORD_KEY, JSON.stringify(records));
            loadUserRecords();
        }

        function loadUserRecords() {
            const records = JSON.parse(localStorage.getItem(RECORD_KEY) || '[]');
            const userRecords = records.filter(r => r.userId === currentUser);
            const totalCount = userRecords.length;
            const correctCount = userRecords.filter(r => r.isCorrect).length;
            const accuracyRate = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

            document.getElementById('totalCount').innerText = totalCount;
            document.getElementById('correctCount').innerText = correctCount;
            document.getElementById('accuracyRate').innerText = `${accuracyRate}%`;

            const recordHistory = document.getElementById('recordHistory');
            if (userRecords.length === 0) {
                recordHistory.innerHTML = '<div class="empty-tip" style="padding: 20px 0; font-size: 14px;">暂无答题记录</div>';
                return;
            }
            recordHistory.innerHTML = '';
            userRecords.reverse().forEach(record => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                const resultClass = record.isCorrect ? 'history-correct' : 'history-wrong';
                const resultText = record.isCorrect ? '答对' : '答错';
                historyItem.innerHTML = `
                    <span class="history-topic">${record.topicContent}</span>
                    <span class="history-result ${resultClass}">${resultText}</span>
                `;
                recordHistory.appendChild(historyItem);
            });
        }

        function addNewTopic() {
            const topicContent = document.getElementById('guessSetInput').value.trim();
            if (!topicContent) return alert('请输入题目');
            const topic = {
                id: Date.now().toString(),
                creator: currentUser,
                content: topicContent,
                createTime: new Date().toLocaleString(),
                canvasData: canvas.toDataURL('image/png') // 保存画板内容
            };
            const topics = JSON.parse(localStorage.getItem(TOPIC_KEY) || '[]');
            topics.push(topic);
            localStorage.setItem(TOPIC_KEY, JSON.stringify(topics));
            document.getElementById('guessSetInput').value = '';
            loadAllTopics();
            alert(`新题目发布成功：${topicContent}`);
        }

        function loadAllTopics() {
            const topics = JSON.parse(localStorage.getItem(TOPIC_KEY) || '[]');
            const topicList = document.getElementById('topicList');
            if (topics.length === 0) {
                topicList.innerHTML = '<div class="empty-tip" style="padding: 20px 0; font-size: 14px;">暂无题目，快来发布第一个！</div>';
                return;
            }
            topicList.innerHTML = '';
            topics.forEach(topic => {
                const topicItem = document.createElement('div');
                topicItem.className = 'topic-item';
                const deleteBtnStyle = currentUser && topic.creator === currentUser ? 'display:block;' : 'display:none;';
                topicItem.innerHTML = `
                    <span class="topic-creator">${topic.creator}</span>
                    <span class="topic-content">${topic.content}</span>
                    <div>
                        <button class="topic-select-btn" onclick="selectTopic('${topic.id}')">选择</button>
                        <button class="topic-delete-btn" style="${deleteBtnStyle}" onclick="deleteTopic('${topic.id}')">删除</button>
                    </div>
                `;
                topicList.appendChild(topicItem);
            });
            // 答题者隐藏题目内容
            if (currentRole === 'guesser') {
                document.querySelectorAll('.topic-content').forEach(el => el.classList.add('guesser-hide'));
            }
        }

        function selectTopic(topicId) {
            const topics = JSON.parse(localStorage.getItem(TOPIC_KEY) || '[]');
            const topic = topics.find(t => t.id === topicId);
            if (!topic) return alert('题目不存在！');
            currentTopic = topic;
            hintLeft = 3;
            document.getElementById('hintCount').innerText = hintLeft;
            document.getElementById('hintBtn').style.display = 'inline-block';
            document.getElementById('guessResult').textContent = '';

            // 加载出题者的画板内容
            if (topic.canvasData) {
                const img = new Image();
                img.onload = function() {
                    clearCanvas();
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }
                img.src = topic.canvasData;
            }

            if (currentRole === 'creator') {
                document.getElementById('guessQuestion').innerText = `当前题目：${topic.content}`;
            } else if (currentRole === 'guesser') {
                document.getElementById('guessQuestion').innerText = '根据画板内容猜答案吧！';
            }
        }

        function deleteTopic(topicId) {
            if (!confirm('确定要删除这个题目吗？删除后他人将无法选择作答')) return;
            let topics = JSON.parse(localStorage.getItem(TOPIC_KEY) || '[]');
            topics = topics.filter(t => t.id !== topicId);
            localStorage.setItem(TOPIC_KEY, JSON.stringify(topics));
            if (currentTopic && currentTopic.id === topicId) {
                currentTopic = null;
                document.getElementById('guessQuestion').innerText = currentRole === 'creator' ? '请发布或选择题目' : '根据画板内容猜答案吧！';
                document.getElementById('guessResult').textContent = '';
                document.getElementById('hintBtn').style.display = 'none';
            }
            loadAllTopics();
            alert('题目已删除！');
        }

        function showHint() {
            if (!currentTopic) return alert('请先选择题目！');
            if (hintLeft <= 0) return alert('提示次数已用完！');
            hintLeft--;
            document.getElementById('hintCount').innerText = hintLeft;
            let hintText = '';
            if (hintLeft === 2) {
                hintText = `提示1：答案首字是【${currentTopic.content.charAt(0)}】`;
            } else if (hintLeft === 1) {
                hintText = `提示2：答案总共有${currentTopic.content.length}个字`;
            } else if (hintLeft === 0) {
                hintText = `终极提示：正确答案是【${currentTopic.content}】`;
                document.getElementById('hintBtn').style.display = 'none';
            }
            document.getElementById('guessResult').textContent = hintText;
        }

        function checkGuess() {
            if (!currentTopic) return alert('请先选择一个题目！');
            const input = document.getElementById('guessInput').value.trim().toLowerCase();
            const result = document.getElementById('guessResult');
            if (!input) return alert('请输入答案！');
            const isCorrect = input === currentTopic.content.toLowerCase();
            if (isCorrect) {
                result.textContent = `恭喜宝宝！猜对啦！`;
            } else {
                result.textContent = `猜错啦！宝宝再想想？还能使用${hintLeft}次提示`;
            }
            saveRecord(isCorrect);
            document.getElementById('guessInput').value = '';
        }

        function saveDrawing() {
            const workData = {
                id: Date.now().toString(),
                author: currentUser,
                time: new Date().toLocaleString(),
                category: '草稿',
                desc: '未发布的草稿',
                img: canvas.toDataURL('image/png'),
                publishTime: new Date().getTime()
            };
            const works = JSON.parse(localStorage.getItem(WORK_KEY) || '[]');
            works.push(workData);
            localStorage.setItem(WORK_KEY, JSON.stringify(works));
            alert('草稿保存成功！留下了一份足迹~🐾');
            loadCommunityWorks();
        }

        function exportDrawing() {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `康柏社区画作_${currentUser}_${new Date().getTime()}.png`;
            link.click();
        }

        function publishToCommunity() {
            const category = document.getElementById('workCategory').value;
            const desc = document.getElementById('workDesc').value.trim() || `【${category}】${currentUser}的康柏主题创作`;
            const workData = {
                id: Date.now().toString(),
                author: currentUser,
                time: new Date().toLocaleString(),
                category: category,
                desc: desc,
                img: canvas.toDataURL('image/png'),
                publishTime: new Date().getTime()
            };
            const works = JSON.parse(localStorage.getItem(WORK_KEY) || '[]');
            works.push(workData);
            localStorage.setItem(WORK_KEY, JSON.stringify(works));
            document.getElementById('workDesc').value = '';
            clearCanvas();
            alert('作品发布成功！年年康乐，岁岁满全~');
            loadCommunityWorks();
        }

        function deleteWork(workId) {
            if (!confirm('真的要删掉嘛 删掉后将无法恢复呀')) return;
            let works = JSON.parse(localStorage.getItem(WORK_KEY) || '[]');
            works = works.filter(work => work.id !== workId);
            localStorage.setItem(WORK_KEY, JSON.stringify(works));
            let comments = JSON.parse(localStorage.getItem(COMMENT_KEY) || '[]');
            comments = comments.filter(comment => comment.workId !== workId);
            localStorage.setItem(COMMENT_KEY, JSON.stringify(comments));
            alert('好吧 已删除');
            loadCommunityWorks();
        }

        function loadCommunityWorks() {
            let works = JSON.parse(localStorage.getItem(WORK_KEY) || '[]');
            works = works.filter(work => work.category !== '草稿');
            const workGrid = document.getElementById('workGrid');
            if (sortType === 'time') {
                works.sort((a, b) => b.publishTime - a.publishTime);
            } else if (sortType === 'category') {
                works.sort((a, b) => a.category.localeCompare(b.category));
            }
            if (works.length === 0) {
                workGrid.innerHTML = '<div class="empty-tip">暂无社区作品，快来发布第一个吧~</div>';
                return;
            }
            workGrid.innerHTML = '';
            works.forEach(work => {
                const workCard = document.createElement('div');
                workCard.className = 'work-card';
                const commentBtnStyle = currentUser ? 'opacity:1; pointer-events:auto;' : 'opacity:0.6; pointer-events:none;';
                const deleteBtnStyle = currentUser && work.author === currentUser ? 'display:block;' : 'display:none;';
                workCard.innerHTML = `
                    <div class="work-author">作者：${work.author}</div>
                    <div class="work-desc">${work.desc}</div>
                    <img src="${work.img}" class="work-img" onclick="loadWorkToCanvas('${work.id}')">
                    <div class="work-foot">
                        <span>${work.category}</span>
                        <div>
                            <button class="comment-btn" style="${commentBtnStyle}" onclick="openCommentModal('${work.id}')">评论</button>
                            <button class="delete-work-btn" style="${deleteBtnStyle}" onclick="deleteWork('${work.id}')">删除作品</button>
                        </div>
                    </div>
                `;
                workGrid.appendChild(workCard);
            });
        }

        function sortWorks(type) {
            sortType = type;
            document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            loadCommunityWorks();
        }

        function loadWorkToCanvas(workId) {
            if (!currentUser) return alert('请先登录后加载作品！');
            const works = JSON.parse(localStorage.getItem(WORK_KEY) || '[]');
            const work = works.find(w => w.id === workId);
            if (!work) return alert('啊哦 作品不存在呀~');
            const img = new Image();
            img.onload = function() {
                clearCanvas();
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
            img.src = work.img;
        }

        function openCommentModal(workId) {
            if (!currentUser) return alert('快来登入~');
            currentWorkId = workId;
            const works = JSON.parse(localStorage.getItem(WORK_KEY) || '[]');
            const work = works.find(w => w.id === workId);
            if (!work) return alert('啊哦 还没有作品哟~');
            const modalWork = document.getElementById('modalWork');
            modalWork.innerHTML = `
                <div class="work-author">作者：${work.author}</div>
                <div class="work-desc">${work.desc}</div>
                <img src="${work.img}" class="modal-work-img">
            `;
            loadCommunityComments();
            document.getElementById('commentModal').style.display = 'flex';
        }

        function closeModal() {
            document.getElementById('commentModal').style.display = 'none';
            document.getElementById('modalCommentInput').value = '';
            currentWorkId = null;
        }

        function sendCommunityComment() {
            const content = document.getElementById('modalCommentInput').value.trim();
            if (!content) return alert('输入评论内容');
            const commentData = {
                id: Date.now().toString(),
                workId: currentWorkId,
                author: currentUser,
                time: new Date().toLocaleString(),
                content: content
            };
            const comments = JSON.parse(localStorage.getItem(COMMENT_KEY) || '[]');
            comments.push(commentData);
            localStorage.setItem(COMMENT_KEY, JSON.stringify(comments));
            document.getElementById('modalCommentInput').value = '';
            loadCommunityComments();
            alert('评论发送成功！海潮逐月，康柏长青~🌱');
        }

        function loadCommunityComments() {
            const comments = JSON.parse(localStorage.getItem(COMMENT_KEY) || '[]');
            const targetComments = currentWorkId ? comments.filter(c => c.workId === currentWorkId) : [];
            const commentList = document.getElementById('modalCommentList');
            if (targetComments.length === 0) {
                commentList.innerHTML = '<div class="empty-tip">暂无评论，快来抢沙发~</div>';
                return;
            }
            commentList.innerHTML = '';
            targetComments.forEach(comment => {
                const commentItem = document.createElement('div');
                commentItem.className = 'comment-item';
                const deleteBtn = comment.author === currentUser ?
                    `<button class="delete-comment-btn" onclick="deleteComment('${comment.id}')">删除</button>` : '';
                commentItem.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${comment.author}</span>
                        <span class="comment-time">${comment.time}</span>
                    </div>
                    <div class="comment-content">${comment.content}</div>
                    ${deleteBtn}
                `;
                commentList.appendChild(commentItem);
            });
        }

        function deleteComment(commentId) {
            if (!confirm('确定要删除这条评论吗？')) return;
            const comments = JSON.parse(localStorage.getItem(COMMENT_KEY) || '[]');
            const newComments = comments.filter(comment => comment.id !== commentId);
            localStorage.setItem(COMMENT_KEY, JSON.stringify(newComments));
            loadCommunityComments();
            alert('评论删除成功！');
        }

        window.onload = function() {
            initCanvas();
            loadCommunityWorks();
            window.addEventListener('click', (e) => {
                if (e.target === document.getElementById('commentModal')) {
                    closeModal();
                }
            });
        }